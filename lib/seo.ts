// lib/seo.ts
// Helper SEO dùng chung cho metadata các trang.
import type { Metadata } from "next";
import { SITE, abs } from "@/lib/site";

/** Ảnh chia sẻ mặc định (Facebook/Zalo/Google) – 1200x630. */
export const DEFAULT_OG_IMAGE = "/images/og-default.jpg";

/** Ảnh thay thế khi sản phẩm/bài viết/danh mục chưa có ảnh. */
export const NO_IMAGE = "/images/no-image.jpg";

/**
 * Layout gốc có title template "%s | MCBROTHER".
 * Nếu tiêu đề admin nhập đã chứa "MCBROTHER" thì dùng nguyên văn (absolute),
 * tránh bị thành "... | MCBROTHER | MCBROTHER".
 */
export function brandTitle(title: string): Metadata["title"] {
  return /mcbrother/i.test(title) ? { absolute: title } : title;
}

/** Cắt mô tả về ~160 ký tự (độ dài Google hiển thị), bỏ thẻ HTML & khoảng trắng thừa. */
export function metaDescription(text: string | null | undefined, max = 160) {
  if (!text) return undefined;
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** URL tuyệt đối cho ảnh (OG cần URL đầy đủ). */
export function absImage(url: string | null | undefined) {
  if (!url) return abs(DEFAULT_OG_IMAGE);
  return /^https?:\/\//i.test(url) ? url : abs(url);
}

/** JSON-LD BreadcrumbList. items: [{ name, path }] theo thứ tự từ Trang chủ. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** Chuỗi JSON an toàn để nhét vào <script type="application/ld+json"> (chặn "</script>"). */
export function ldJson(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export { SITE };