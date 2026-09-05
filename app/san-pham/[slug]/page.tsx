// app/san-pham/[slug]/page.tsx
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Settings, Zap } from "lucide-react";
export const dynamic = 'force-dynamic';
import { ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { cache } from "react";
import ProductMedia from "@/components/ProductMedia";
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

function formatVND(n: number) {
  try {
    return new Intl.NumberFormat('vi-VN').format(n) + '₫';
  } catch {
    return `${n}₫`;
  }
}

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
  const description = p.metaDescription || p.short || undefined;

  return {
    title,
    description,
    alternates: p.canonicalUrl
      ? { canonical: p.canonicalUrl }
      : undefined,
    openGraph: {
      title,
      description,
      images: p.ogImage || p.coverImage
        ? [String(p.ogImage || p.coverImage)]
        : undefined,
    },
    robots: {
      index: !(p.noindex ?? false),
      follow: !(p.nofollow ?? false),
    },
  };
}
function PriceInline({
  price,
  noAnchor = false,
}: {
  price?: number | null;
  noAnchor?: boolean;
}) {
  if (typeof price === 'number') return <>Giá: {formatVND(price)}</>;
  return <span>Giá: Liên hệ</span>;
}
/* ===================== PAGE ===================== */

export default async function ProductDetailPage(
  { params: paramsPromise }: { params: Promise<Params> }
) {
  const { slug } = await paramsPromise;

  const p = await getProduct(slug);

  if (!p || !p.published) {
    return <div>Không tìm thấy sản phẩm</div>;
  }

  // 🔥 TYPE SAFE
  const specTable = p.specTable as SpecTable | null;
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
  const descHtml = rawDescHtml
    ? normalizeDescHeadings(rawDescHtml)
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
    description: p.metaDescription || p.short || undefined,
    offers:
      typeof p.price === 'number'
        ? {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: String(p.price),
          availability: 'https://schema.org/InStock',
        }
        : undefined,
    additionalProperty: additionalProps.map((x) => ({
      '@type': 'PropertyValue',
      name: x.name,
      value: x.value,
    })),
  };
  // app/san-pham/[slug]/page.tsx
  // (GIỮ NGUYÊN TOÀN BỘ IMPORT + HELPER + SEO + QUERY)
  return (
    <main className="bg-[var(--color-bg)] text-slate-800">

      {/* ===== HERO ===== */}
      <section className="relative">
        <img
          src="https://res.cloudinary.com/ds55hfvx4/image/upload/v1778214441/ChatGPT_Image_11_26_29_8_thg_5_2026_vuknuv.png"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative max-w-7xl xl:max-w-[1280px] mx-auto px-4 py-16 text-white">

          {/* breadcrumb */}
          <div className="text-sm text-white/80 mb-3">
            <Link href="/" className="hover:underline">Trang chủ</Link>
            <span className="px-2">/</span>
            <Link href="/san-pham" className="hover:underline">Sản phẩm</Link>
            {p.category && (
              <>
                <span className="px-2">/</span>
                <Link href={`/danh-muc/${p.category.slug}`} className="hover:underline">
                  {p.category.name}
                </Link>
              </>
            )}
          </div>

          <h1 className="text-[28px] md:text-[34px] font-semibold leading-snug max-w-3xl">
            {p.name}
          </h1>

          {p.short && (
            <p className="mt-2 text-sm text-white/80 max-w-2xl">
              {p.short}
            </p>
          )}
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <section className="py-10">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">

          <div className="grid lg:grid-cols-2 gap-10">

            {/* ===== LEFT ===== */}
            <div className="space-y-6 lg:mt-[100px]">

              {/* IMAGE + VIDEO */}
              <ProductMedia
                mainImg={mainImg}
                mainSrcSet={mainSrcSet}
                productName={p.name}
                videoUrl={p.videoUrl}
                images={galleryImages}
              />

            </div>

            {/* ===== RIGHT (STICKY) ===== */}
            <div className="space-y-6 lg:sticky top-24 h-fit">

              {/* PRICE */}
              <div className="text-[28px] font-bold text-[var(--color-primary-dark)]">
                <PriceInline price={p.price} />
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <a
                  href={ZALO_URL}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-center py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition"
                >
                  Nhận báo giá
                </a>
                <a

                  href="tel:0834551888"
                  className="flex-1 border border-[var(--color-border)] text-center py-3 rounded-xl hover:bg-gray-50 hover:shadow-sm hover:border-[var(--color-primary)] transition"
                >
                  Gọi ngay
                </a>
              </div>

              {/* TRUST */}


              <div className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 rounded-xl p-4 shadow-sm">
                <div className="space-y-2 text-sm text-gray-700">

                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-[var(--color-accent)]" />
                    Hàng chính hãng
                  </div>

                  {p.warranty !== "0 tháng" && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
                      Bảo hành {p.warranty || "12 tháng"}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[var(--color-accent)]" />
                    Giao hàng toàn quốc
                  </div>

                </div>
              </div>

              {/* SPECS */}
              {(p.power || p.voltage || p.weight || p.dimensions || p.functions || p.material || p.attributes.length > 0) && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-3xl">
                  <h2 className="text-base font-bold mb-4 text-[var(--color-primary-dark)]">
                    Thông số kỹ thuật
                  </h2>

                  {/* Sử dụng Grid chia 2 cột mượt mà, căn chỉnh đồng đều */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 text-sm text-gray-700">

                    {p.power && (
                      <div className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">Công suất</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{p.power}</span>
                      </div>
                    )}

                    {p.voltage && (
                      <div className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">Điện áp</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{p.voltage}</span>
                      </div>
                    )}

                    {p.weight && (
                      <div className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">Cân nặng</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{p.weight}</span>
                      </div>
                    )}

                    {p.dimensions && (
                      <div className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">Kích thước</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{p.dimensions}</span>
                      </div>
                    )}

                    {p.material && (
                      <div className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">Vật liệu</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{p.material}</span>
                      </div>
                    )}

                    {/* Rút các thuộc tính bổ sung vào chung luồng 2 cột */}
                    {p.attributes.map((a, i) => (
                      <div key={i} className="flex items-center py-3 border-b border-gray-100">
                        <span className="w-1/3 text-gray-400 font-medium shrink-0">{a.name}</span>
                        <span className="w-2/3 text-gray-900 font-semibold pl-2">{a.value}</span>
                      </div>
                    ))}

                    {/* Đẩy Chức năng xuống cuối và cho chiếm trọn cả hàng để text dài hiển thị thoải mái nhất */}
                    {p.functions && (
                      <div className="flex items-start py-3 border-b border-gray-100 md:col-span-2">
                        <span className="w-1/3 md:w-[16.6%] text-gray-400 font-medium shrink-0">Chức năng</span>
                        <span className="w-2/3 md:w-[83.4%] text-gray-900 font-semibold pl-2">{p.functions}</span>
                      </div>
                    )}

                  </div>
                </div>
              )}




              <div className="bg-gray-50 border rounded-xl p-4 shadow-sm">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Lắp đặt &amp; hướng dẫn vận hành tận nơi
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    Hỗ trợ kỹ thuật trọn đời máy
                  </li>
                  <li className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-600" />
                    Có sẵn linh kiện thay thế chính hãng
                  </li>
                </ul>
              </div>

            </div>
          </div>


          {/* ===== DESCRIPTION ===== */}
          {(descHtml || p.specTable) && (
            <div className="mt-12 space-y-6">

              {/* TITLE */}
              <h2 className="text-xl font-semibold tracking-tight">
                Mô tả chi tiết
              </h2>

              {/* ===== TABLE (ưu tiên hiển thị) ===== */}
              {p.specTable && (() => {
                const specTable = p.specTable as {
                  columns: string[];
                  rows: { label: string; values: string[] }[];
                };

                const columns = specTable.columns || [];
                const rows = specTable.rows || [];

                return (
                  <div className="overflow-x-auto">
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">

                      {/* HEADER */}
                      {/* <div
                        className="grid text-sm font-semibold bg-gray-50"
                        style={{ gridTemplateColumns: `200px repeat(${columns.length}, 1fr)` }}
                      >
                        <div className="p-3">Thông số</div>

                        {columns.map((col, i) => (
                          <div key={i} className="p-3 text-center">
                            {col}
                          </div>
                        ))}
                      </div> */}

                      {/* ROWS */}
                      {/* {rows.map((row, i) => (
                        <div
                          key={i}
                          className={`grid text-sm border-t border-[var(--color-border)] ${i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          style={{ gridTemplateColumns: `200px repeat(${columns.length}, 1fr)` }}
                        >
                          <div className="p-3 text-[var(--color-muted)] font-medium">
                            {row.label}
                          </div>

                          {row.values?.map((val, j) => (
                            <div key={j} className="p-3 text-center font-medium">
                              {val}
                            </div>
                          ))}
                        </div>
                      ))} */}

                    </div>
                  </div>
                );
              })()}

              {/* ===== HTML CONTENT (CMS) ===== */}
              {descHtml && (
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">

                  <div
                    className="
    blog-content
    prose
    max-w-none

    [&_p]:!max-w-none
    [&_h2]:!max-w-none
    [&_h3]:!max-w-none
    [&_ul]:!max-w-none
    [&_ol]:!max-w-none
    [&_table]:!w-full

    prose-slate

    prose-headings:text-[var(--color-primary-dark)]
    prose-headings:font-semibold

    prose-h2:my-4
    prose-h3:my-3

    prose-p:my-2
    prose-p:leading-7

    prose-li:my-1
    prose-li:leading-6

    prose-table:border
    prose-table:border-[var(--color-border)]
    prose-th:bg-gray-50
    prose-th:font-semibold
    prose-td:align-middle
  "
                    dangerouslySetInnerHTML={{ __html: descHtml }}
                  />

                </div>
              )}

            </div>
          )}
          {/* ===== FAQ ===== */}
          {Array.isArray(p.faqs) && p.faqs.length > 0 && (
            <div className="mt-12 space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Câu hỏi thường gặp
              </h2>

              <div className="bg-white border border-[var(--color-border)] rounded-2xl divide-y shadow-sm">
                {p.faqs.map((item: any, i: number) => (
                  <details key={i} className="group p-4 cursor-pointer">
                    <summary className="flex justify-between items-center font-medium list-none">
                      {item.question}
                      <span className="transition group-open:rotate-180">▼</span>
                    </summary>

                    <div className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
          {/* ===== RELATED ===== */}
          {related.length > 0 && (
            <div className="mt-14">
              <h2 className="text-[20px] font-semibold mb-6 text-center">
                Sản phẩm liên quan
              </h2>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {related.map((rp) => {
                  const features =
                    rp.short
                      ?.split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 2) || [];

                  return (
                    <div
                      key={rp.id}
                      className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-[4px] hover:border-[var(--color-primary)]"
                    >
                      {/* IMAGE */}
                      <Link href={`/san-pham/${rp.slug}`} className="relative block">
                        <div className="relative h-[180px] bg-white flex items-center justify-center overflow-hidden">
                          <img
                            src={rp.coverImage || "/images/placeholder.jpg"}
                            alt={rp.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
                          />
                        </div>
                      </Link>

                      {/* CONTENT */}
                      <div className="flex flex-col p-4">

                        {/* TITLE */}
                        <Link href={`/san-pham/${rp.slug}`}>
                          <h3 className="text-[14px] font-semibold leading-snug text-gray-800 line-clamp-2 hover:text-[var(--color-primary)] transition">
                            {rp.name}
                          </h3>
                        </Link>

                        {/* FEATURES */}

                        <div className="mt-2 min-h-[40px]">
                          {features.length > 0 && (
                            <ul className="text-[12px] text-gray-600 space-y-1">
                              {features.map((f, i) => {
                                // chọn icon theo nội dung
                                let Icon = Settings;

                                if (f.toLowerCase().includes("công suất")) Icon = Zap;
                                else if (f.toLowerCase().includes("bền")) Icon = ShieldCheck;

                                return (
                                  <li key={i} className="flex items-start gap-2">
                                    <Icon className="w-3.5 h-3.5 mt-[2px] shrink-0 text-[var(--color-primary)]" />
                                    <span className="line-clamp-1 leading-snug">{f}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        {/* PRICE */}
                        <div className="mt-2 text-[14px] font-semibold text-[var(--color-primary-dark)]">
                          <PriceInline price={rp.price} />
                        </div>

                        {/* TRUST */}
                        <div className="mt-2 text-[11px] text-gray-500 space-y-1">

                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)]" />
                            <span>Bảo hành 12 tháng</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)]" />
                            <span>Giao hàng toàn quốc</span>
                          </div>

                        </div>

                        {/* CTA */}
                        <div className="pt-3 flex gap-2 mt-auto">

                          <Link
                            href={`/san-pham/${rp.slug}`}
                            className="flex-1 text-center py-2 rounded border border-gray-200 text-[12px] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
                          >
                            Xem chi tiết
                          </Link>
                          <a

                            href="https://zalo.me/0834551888"
                            target="_blank"
                            className="flex-1 text-center py-2 rounded bg-[var(--color-primary)] text-white text-[12px] font-semibold hover:bg-[var(--color-primary-dark)] transition"
                          >
                            Báo giá
                          </a>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>


    </main>
  );
}