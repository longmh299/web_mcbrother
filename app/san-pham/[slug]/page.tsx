// app/san-pham/[slug]/page.tsx
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from "react";
import ProductMedia from "@/components/ProductMedia";
import { sanitizeHtml } from "@/lib/sanitize";
import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect } from "@/lib/slug-redirect";
import { abs } from "@/lib/site";
import { brandTitle, metaDescription, absImage, breadcrumbJsonLd, ldJson, NO_IMAGE } from "@/lib/seo";
import { formatPrice, hasPrice } from "@/lib/price";
import { SITE } from "@/lib/site";
/* ===================== CONFIG ===================== */
// ĐỔI SANG ZALO CỦA BẠN
const ZALO_URL = 'https://zalo.me/0834551888';
/* ================================================== */

export const revalidate = 60;

/* ===================== TYPES ===================== */

type Params = { slug: string };

type FAQ = {
  question: string;
  answer: string;
};

type SpecTable = {
  columns: string[];
  rows: { label: string; values: string[] }[];
};

/* ===================== HELPERS ===================== */

function cld(url?: string | null, w = 900, h = 600) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com')) {
      return url.replace(
        '/upload/',
        `/upload/c_fit,f_auto,q_auto,w_${w},h_${h}/`
      );
    }
  } catch { }
  return url;
}

function cldSet(url?: string | null, baseW = 900, baseH = 600) {
  if (!url) return undefined;
  const W = [480, 720, baseW, 1200];
  return W.map(
    (w) => `${cld(url, w, Math.round((w * baseH) / baseW))} ${w}w`
  ).join(', ');
}

function decodeHtmlEntities(html?: string | null) {
  if (!html) return '';
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeDescHeadings(html: string) {
  return html
    .replace(/<h1(\s|>)/gi, '<h2$1')
    .replace(/<\/h1>/gi, '</h2>');
}

/* ===================== DATA ===================== */

// 🔥 cache để tránh query 2 lần (page + metadata)
const getProduct = cache(async (slug: string) => {
  return prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      short: true,
      description: true,
      price: true,
      coverImage: true,
      videoUrl: true,
      power: true,
      voltage: true,
      weight: true,
      dimensions: true,
      functions: true,
      material: true,
      specTable: true,
      faqs: true,
      published: true,
      categoryId: true,
      sku: true,
      metaTitle: true,
      warranty: true,
      metaDescription: true,
      canonicalUrl: true,
      ogImage: true,
      noindex: true,
      nofollow: true,
      category: {
        select: { id: true, name: true, slug: true },
      },
      attributes: {
        select: { name: true, value: true },
        orderBy: { sort: 'asc' },
      },
      images: {
        select: { url: true, alt: true },
        orderBy: { sort: 'asc' },
      },
    },
  });
});

/* ===================== SEO ===================== */

export async function generateMetadata(
  { params: paramsPromise }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await paramsPromise;
  const p = await getProduct(slug);

  if (!p) return {};

  const title = p.metaTitle || p.name;
  const description =
    metaDescription(p.metaDescription || p.short || p.description) ||
    `${p.name} – MCBROTHER JSC cung cấp, lắp đặt tận nơi, bảo hành chính hãng.`;
  // Mặc định canonical = chính URL sản phẩm (tránh trùng lặp do ?utm=, ?fbclid=…)
  const url = p.canonicalUrl || abs(`/san-pham/${p.slug}`);
  const image = absImage(p.ogImage || p.coverImage);

  return {
    title: brandTitle(title),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: [{ url: image, alt: p.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: !(p.noindex ?? false),
      follow: !(p.nofollow ?? false),
    },
  };
}
/* ===================== PAGE ===================== */

export default async function ProductDetailPage(
  { params: paramsPromise }: { params: Promise<Params> }
) {
  const { slug } = await paramsPromise;

  const p = await getProduct(slug);

  if (!p) {
    // Slug cũ (đã đổi tên) → chuyển 308 sang slug mới; không có → 404 thật
    const to = await findRedirect('product', slug);
    if (to) permanentRedirect(`/san-pham/${to}`);
    notFound();
  }
  if (!p.published) notFound();

  // 🔥 TYPE SAFE
  const specTable = p.specTable as SpecTable | null;
  // Chỉ hiện bảng so sánh model khi có cột & dòng thật (tránh khung trống)
  const hasSpecTable =
    !!specTable && Array.isArray(specTable.columns) && specTable.columns.length > 0 &&
    Array.isArray(specTable.rows) && specTable.rows.length > 0;
  const faqs = (p.faqs as FAQ[]) || [];

  // 🔥 related (không block getProduct)
  const related = await prisma.product.findMany({
    where: p.categoryId
      ? { published: true, categoryId: p.categoryId, id: { not: p.id } }
      : { published: true, id: { not: p.id } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: 8,
    select: {
      id: true,
      slug: true,
      name: true,
      coverImage: true,
      price: true,
      short: true,
    },
  });

  // 🔥 description xử lý
  const rawDescHtml = decodeHtmlEntities(p.description);
  // Lọc XSS SAU khi decode (decode có thể biến &lt;script&gt; thành <script> thật)
  const descHtml = rawDescHtml
    ? normalizeDescHeadings(sanitizeHtml(rawDescHtml))
    : '';

  const mainImg = cld(p.coverImage, 900, 600);
  const mainSrcSet = cldSet(p.coverImage, 900, 600);

  // 🔥 thư viện ảnh phụ (ngoài ảnh đại diện)
  const galleryImages = (p.images || [])
    .map((im) => ({ url: cld(im.url, 900, 600) || im.url, alt: im.alt }))
    .filter((im) => im.url);

  // 🔥 JSON-LD
  const additionalProps: { name: string; value: string }[] = [];

  const pushIf = (name: string, v?: string | null) => {
    if (v && v.trim()) additionalProps.push({ name, value: v });
  };

  pushIf('Công suất', p.power);
  pushIf('Điện áp', p.voltage);
  pushIf('Cân nặng', p.weight);
  pushIf('Kích thước', p.dimensions);
  pushIf('Chức năng', p.functions);
  pushIf('Vật liệu', p.material);

  for (const a of p.attributes) {
    if (a.name && a.value) {
      additionalProps.push({ name: a.name, value: a.value });
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku || undefined,
    image: p.coverImage
      ? [p.coverImage, ...galleryImages.map((im) => im.url)]
      : galleryImages.length
        ? galleryImages.map((im) => im.url)
        : undefined,
    description: metaDescription(p.metaDescription || p.short || p.description),
    url: abs(`/san-pham/${p.slug}`),
    brand: { '@type': 'Brand', name: 'MCBROTHER' },
    category: p.category?.name || undefined,
    // Chỉ khai báo giá cho Google khi có giá thật (> 0); giá 0 = "Liên hệ"
    offers:
      hasPrice(p.price)
        ? {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: String(p.price),
          availability: 'https://schema.org/InStock',
          url: abs(`/san-pham/${p.slug}`),
          seller: { '@id': abs('/#organization') },
        }
        : undefined,
    additionalProperty: additionalProps.map((x) => ({
      '@type': 'PropertyValue',
      name: x.name,
      value: x.value,
    })),
  };
  // app/san-pham/[slug]/page.tsx
  // JSON-LD FAQ: từ mục "Câu hỏi thường gặp" của sản phẩm (bỏ câu hỏi/trả lời trống)
  const faqItems = (Array.isArray(p.faqs) ? (p.faqs as FAQ[]) : []).filter(
    (f) => f?.question?.trim() && f?.answer?.trim()
  );
  const faqLd = faqItems.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({
        '@type': 'Question',
        name: f.question.trim(),
        acceptedAnswer: { '@type': 'Answer', text: f.answer.trim() },
      })),
    }
    : null;
  // (GIỮ NGUYÊN TOÀN BỘ IMPORT + HELPER + SEO + QUERY)
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Trang chủ', path: '/' },
    { name: 'Sản phẩm', path: '/san-pham' },
    ...(p.category ? [{ name: p.category.name, path: `/${p.category.slug}` }] : []),
    { name: p.name, path: `/san-pham/${p.slug}` },
  ]);

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* JSON-LD cho Google: thông tin sản phẩm + breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(faqLd) }}
        />
      )}

      {/* ===== BREADCRUMB ===== */}
      <div className="mx-auto max-w-[1320px] px-4 pt-8 md:px-8">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-ink)]">Trang chủ</Link>
          <span className="px-2">/</span>
          <Link href="/san-pham" className="hover:text-[var(--color-ink)]">Sản phẩm</Link>
          {p.category && (
            <>
              <span className="px-2">/</span>
              <Link href={`/${p.category.slug}`} className="hover:text-[var(--color-ink)]">
                {p.category.name}
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* ===== ẢNH + THÔNG TIN CHÍNH ===== */}
      <section className="mx-auto grid max-w-[1320px] items-start gap-10 px-4 pt-8 md:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        {/* TRÁI: ảnh / video */}
        <ProductMedia
          mainImg={mainImg}
          mainSrcSet={mainSrcSet}
          productName={p.name}
          videoUrl={p.videoUrl}
          images={galleryImages}
        />

        {/* PHẢI: dính khi cuộn */}
        <div className="flex h-fit flex-col gap-7 lg:sticky lg:top-28">
          {p.category && <span className="eyebrow">{p.category.name}</span>}

          <h1 className="display-lg text-[clamp(32px,3.8vw,54px)] [text-wrap:balance]">{p.name}</h1>

          {p.short && (
            <p className="whitespace-pre-line text-[17px] leading-relaxed text-[var(--color-muted)]">{p.short}</p>
          )}

          {/* GIÁ + NÚT */}
          <div className="space-y-3 rounded-[24px] bg-white p-6">
            {hasPrice(p.price) ? (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Giá</span>
                <span className="font-display text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                  {formatPrice(p.price)}
                </span>
              </div>
            ) : (
              // Chưa có giá (giá = 0): không hiện chữ "Liên hệ" cỡ lớn, thay bằng lời mời báo giá
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[15px] leading-snug text-[var(--color-muted)]">
                  Báo giá theo cấu hình, <strong className="font-semibold text-[var(--color-ink)]">phản hồi trong ngày</strong>
                </span>
              </div>
            )}
            {/* Sang trang Liên hệ, tự điền sẵn tên máy vào form */}
            <Link
              href={`/lien-he?sp=${encodeURIComponent(p.name)}`}
              className="btn-pill-primary w-full min-h-[54px] text-[16px]"
            >
              Nhận báo giá máy này
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${SITE.phone}`} className="btn-pill-outline">
                <span className="sm:hidden">Gọi ngay</span>
                <span className="hidden sm:inline">Gọi {SITE.phoneDisplay}</span>
              </a>
              <a href={ZALO_URL} target="_blank" rel="noopener" className="btn-pill-dark font-medium">
                Nhắn Zalo
              </a>
            </div>
          </div>

          {/* CAM KẾT */}
          <ul className="space-y-2.5 text-[15px] text-[#3A3833]">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Hàng chính hãng, có sẵn linh kiện thay thế
            </li>
            {p.warranty !== "0 tháng" && (
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                Bảo hành {p.warranty || "12 tháng"}
              </li>
            )}
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Giao hàng, lắp đặt & hướng dẫn vận hành tận nơi
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Hỗ trợ kỹ thuật trọn đời máy
            </li>
          </ul>
        </div>
      </section>

      {/* ===== THÔNG SỐ KỸ THUẬT ===== */}
      {(p.power || p.voltage || p.weight || p.dimensions || p.functions || p.material || p.attributes.length > 0) && (
        <section className="mx-auto max-w-[1320px] px-4 pt-24 md:px-8 md:pt-32">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div className="space-y-4">
              <span className="eyebrow">Thông số</span>
              <h2 className="display-lg text-[clamp(30px,3.6vw,52px)]">Thông số kỹ thuật</h2>
            </div>
            <dl className="border-t border-[var(--color-line)] text-[16px]">
              {[
                { k: "Công suất", v: p.power },
                { k: "Điện áp", v: p.voltage },
                { k: "Cân nặng", v: p.weight },
                { k: "Kích thước", v: p.dimensions },
                { k: "Vật liệu", v: p.material },
                ...p.attributes.map((a) => ({ k: a.name, v: a.value })),
                { k: "Chức năng", v: p.functions },
              ]
                .filter((row) => row.v)
                .map((row, i) => (
                  <div key={i} className="grid grid-cols-[40%_1fr] gap-4 border-b border-[var(--color-line)] py-4">
                    <dt className="text-[var(--color-muted)]">{row.k}</dt>
                    <dd className="whitespace-pre-line font-semibold">{row.v}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </section>
      )}

      {/* ===== MÔ TẢ CHI TIẾT + BẢNG SO SÁNH MODEL ===== */}
      {(descHtml || hasSpecTable) && (
        <section className="mx-auto max-w-[1320px] space-y-10 px-4 pt-24 md:px-8 md:pt-32">
          <div className="space-y-4">
            <span className="eyebrow">Tổng quan</span>
            <h2 className="display-lg text-[clamp(30px,3.6vw,52px)]">Mô tả chi tiết</h2>
          </div>

          {hasSpecTable && specTable && (
            <div>
              <h3 className="mb-4 text-[17px] font-semibold">Bảng so sánh model</h3>
              <div className="overflow-x-auto rounded-[24px] bg-white">
                <table className="w-full min-w-[480px] border-collapse text-[15px]">
                  <thead>
                    <tr className="bg-[var(--color-ink)] text-white">
                      <th className="sticky left-0 z-10 bg-[var(--color-ink)] px-5 py-4 text-left font-medium">Thông số</th>
                      {specTable.columns.map((col, i) => (
                        <th key={i} className="whitespace-nowrap px-5 py-4 text-center font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {specTable.rows.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--color-line)]">
                        <td className="sticky left-0 z-10 w-[32%] bg-white px-5 py-4 text-[var(--color-muted)]">{row.label}</td>
                        {specTable.columns.map((_, j) => (
                          <td key={j} className="px-5 py-4 text-center font-semibold">
                            {row.values?.[j] || <span className="text-[var(--color-line)]">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {descHtml && (
            <div className="overflow-x-auto rounded-[28px] bg-white p-5 md:p-12">
              <div
                className="
                  blog-content prose max-w-none text-[16px]
                  [&_p]:!max-w-none [&_h2]:!max-w-none [&_h3]:!max-w-none [&_ul]:!max-w-none [&_ol]:!max-w-none [&_table]:!w-full
                  prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-[var(--color-ink)]
                  prose-h2:mb-3 prose-h2:mt-10 first:prose-h2:mt-0 prose-h3:my-3
                  prose-p:my-3 prose-p:leading-8 prose-p:text-[#3A3833]
                  prose-li:my-1 prose-li:leading-8 prose-li:text-[#3A3833]
                  prose-table:border prose-table:border-[var(--color-line)] prose-th:bg-[var(--color-bg)] prose-th:font-semibold prose-td:align-middle
                "
                dangerouslySetInnerHTML={{ __html: descHtml }}
              />
            </div>
          )}
        </section>
      )}

      {/* ===== HỎI ĐÁP ===== */}
      {faqItems.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pt-24 md:px-8 md:pt-32">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div className="space-y-4">
              <span className="eyebrow">Hỏi đáp</span>
              <h2 className="display-lg text-[clamp(30px,3.6vw,52px)]">Câu hỏi thường gặp</h2>
            </div>
            <div className="border-t border-[var(--color-line)]">
              {faqItems.map((item, i) => (
                <details key={i} className="group border-b border-[var(--color-line)] py-6">
                  <summary className="flex cursor-pointer list-none items-center gap-6 font-display text-[20px] font-semibold tracking-[-0.015em] [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{item.question}</span>
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-xl leading-none transition group-open:rotate-45 group-open:border-[var(--color-ink)] group-open:bg-[var(--color-ink)] group-open:text-white"
                    >
                      +
                    </span>
                  </summary>
                  <div className="whitespace-pre-line pt-4 text-[16px] leading-8 text-[var(--color-muted)]">{item.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SẢN PHẨM LIÊN QUAN ===== */}
      {related.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 py-24 md:px-8 md:py-32">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="display-lg text-[clamp(30px,3.6vw,52px)]">Sản phẩm liên quan</h2>
            <Link href={p.category ? `/${p.category.slug}` : "/san-pham"} className="link-underline">
              Xem tất cả
            </Link>
          </div>

          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((rp) => {
              const line = rp.short?.split("\n").map((x) => x.trim()).filter(Boolean)[0];
              return (
                <Link key={rp.id} href={`/san-pham/${rp.slug}`} className="group flex flex-col">
                  <div className="flex [aspect-ratio:1/1] items-center justify-center overflow-hidden rounded-[24px] bg-white p-6">
                    <img
                      src={cld(rp.coverImage, 600, 600) || NO_IMAGE}
                      alt={rp.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain mix-blend-multiply transition duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-display text-[19px] font-semibold leading-[1.2] tracking-[-0.02em] group-hover:text-[var(--color-primary)]">
                    {rp.name}
                  </h3>
                  {line && <p className="mt-1.5 line-clamp-1 text-[14px] text-[var(--color-muted)]">{line}</p>}
                  <div className="mt-3 border-t border-[var(--color-line)] pt-3 text-[15px] font-semibold text-[var(--color-primary)]">
                    {hasPrice(rp.price) ? formatPrice(rp.price) : "Liên hệ báo giá"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}