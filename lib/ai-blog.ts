// lib/ai-blog.ts
// Dữ liệu THẬT của web đưa cho AI khi viết bài blog: sản phẩm liên quan (tên, thông số, link),
// bài viết đã có (để link nội bộ & tránh trùng chủ đề), chuyên mục, thông tin công ty.
// → AI không phải bịa thông số, bài có link về sản phẩm thật → kéo traffic về trang bán hàng.
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { stripHtml } from "@/lib/seo-audit";

const STOP = new Set([
  "máy", "may", "và", "cho", "các", "của", "là", "có", "với", "trong", "những", "một", "cách", "nào", "gì", "tốt",
  "nhất", "loại", "chọn", "mua", "giá", "bao", "nhiêu", "năm", "2024", "2025", "2026", "hướng", "dẫn", "top", "so", "sánh",
]);

/** Từ khoá có nghĩa (≥ 3 ký tự, bỏ từ chung chung) */
export function keywordTokens(s: string) {
  return [...new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 8);
}

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export type BlogProduct = { slug: string; name: string; coverImage: string | null; facts: string };

/** Sản phẩm liên quan tới chủ đề, xếp theo số từ khoá khớp */
export async function relatedProducts(topic: string, take = 6): Promise<BlogProduct[]> {
  const tokens = keywordTokens(topic);
  if (!tokens.length) return [];
  const rows = await prisma.product.findMany({
    where: {
      published: true,
      OR: tokens.flatMap((t) => [
        { name: { contains: t, mode: "insensitive" as const } },
        { short: { contains: t, mode: "insensitive" as const } },
        { category: { name: { contains: t, mode: "insensitive" as const } } },
      ]),
    },
    select: {
      slug: true, name: true, short: true, coverImage: true, price: true, power: true, voltage: true,
      dimensions: true, weight: true, material: true, functions: true, warranty: true, highlights: true,
      category: { select: { name: true } },
    },
    take: 60,
  });
  const score = (r: (typeof rows)[number]) => {
    const hay = `${r.name} ${r.short ?? ""} ${r.category?.name ?? ""}`.toLowerCase();
    return tokens.reduce((s, t) => s + (r.name.toLowerCase().includes(t) ? 3 : hay.includes(t) ? 1 : 0), 0);
  };
  return rows
    .map((r) => ({ r, s: score(r) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, take)
    .map(({ r }) => ({
      slug: r.slug,
      name: r.name,
      coverImage: r.coverImage,
      facts: [
        r.category?.name && `Danh mục: ${r.category.name}`,
        r.short && `Mô tả: ${clip(stripHtml(r.short), 300)}`,
        r.power && `Công suất: ${r.power}`,
        r.voltage && `Điện áp: ${r.voltage}`,
        r.dimensions && `Kích thước: ${r.dimensions}`,
        r.weight && `Trọng lượng: ${r.weight}`,
        r.material && `Chất liệu: ${r.material}`,
        r.functions && `Chức năng: ${clip(r.functions, 200)}`,
        r.warranty && `Bảo hành: ${r.warranty}`,
        r.highlights?.length && `Điểm nổi bật: ${r.highlights.slice(0, 5).join("; ")}`,
      ]
        .filter(Boolean)
        .join(" | "),
    }));
}

/** Bài viết đã đăng: liên quan tới chủ đề (để link nội bộ) + toàn bộ tiêu đề gần đây (để tránh trùng) */
export async function existingPosts(topic: string, excludeId?: number) {
  const tokens = keywordTokens(topic);
  const all = await prisma.post.findMany({
    where: { published: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const related = all
    .map((p) => ({ p, s: tokens.filter((t) => p.title.toLowerCase().includes(t)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map((x) => x.p);
  return { related, titles: all.map((p) => p.title) };
}

export async function postCategories() {
  return prisma.postCategory.findMany({ select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export const COMPANY_BRIEF = `${SITE.name} (${SITE.legalName}) — ${SITE.tagline} Hotline/Zalo ${SITE.phoneDisplay}, địa chỉ ${SITE.address}. Có lắp đặt, hướng dẫn vận hành, bảo hành.`;

/** Thẻ hình sản phẩm chèn vào bài thay cho [[SP:slug]] */
export function productFigure(p: BlogProduct) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  if (!p.coverImage) return `<p><a href="/san-pham/${p.slug}">Xem chi tiết ${esc(p.name)}</a></p>`;
  return `<figure><a href="/san-pham/${p.slug}"><img src="${esc(p.coverImage)}" alt="${esc(p.name)}" loading="lazy" /></a><figcaption><a href="/san-pham/${p.slug}">${esc(p.name)}</a></figcaption></figure>`;
}

/**
 * Làm sạch bài AI viết: bỏ script/style/class, H1 → H2, [[SP:slug]] → ảnh sản phẩm thật (tối đa 3),
 * chỉ giữ link nội bộ có thật (/san-pham/…, /tin-tuc/…, /lien-he) + gọi điện / Zalo; link lạ → giữ chữ, bỏ link.
 */
export function cleanAiArticle(raw: string, products: BlogProduct[], postSlugs: string[]) {
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const posts = new Set(postSlugs);
  const used = new Set<string>();
  return raw
    .replace(/```(?:html)?/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(style|class|on\w+)="[^"]*"/gi, "")
    .replace(/<h1(\s[^>]*)?>/gi, "<h2>")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/(?:<p>\s*)?\[\[SP:([a-z0-9-]+)\]\](?:\s*<\/p>)?/gi, (_m, slug: string) => {
      const p = productBySlug.get(slug);
      if (!p || used.has(slug) || used.size >= 3) return "";
      used.add(slug);
      return productFigure(p);
    })
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const h = href.trim().replace(/^https?:\/\/(www\.)?mcbrother\.com\.vn/i, "");
      const sp = h.match(/^\/san-pham\/([a-z0-9-]+)\/?$/i)?.[1];
      const tt = h.match(/^\/tin-tuc\/([a-z0-9-]+)\/?$/i)?.[1];
      const ok =
        (sp && productBySlug.has(sp)) ||
        (tt && posts.has(tt)) ||
        /^\/(lien-he|san-pham|tin-tuc)\/?$/.test(h) ||
        /^tel:\+?\d+$/.test(h) ||
        h.startsWith(SITE.zaloUrl);
      return ok ? `<a href="${h}">${label}</a>` : label;
    })
    .replace(/<p>\s*<\/p>/g, "")
    .trim();
}
