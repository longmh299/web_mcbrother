// app/[slug]/page.tsx — trang danh mục sản phẩm (URL: /<slug-danh-muc>)

import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import { prisma } from "@/lib/prisma";
import { abs } from "@/lib/site";
import { brandTitle, metaDescription, absImage, breadcrumbJsonLd, ldJson } from "@/lib/seo";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
export const runtime = "nodejs";
// ISR: cache trang danh mục, làm mới tối đa sau 60 giây
export const revalidate = 60;

/* ================= SEO ================= */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  const c = await prisma.category.findUnique({
    where: { slug },
  });

  if (!c) return {};

  const title = c.metaTitle || c.name;
  const description =
    metaDescription(c.metaDescription) ||
    `MCBROTHER cung cấp ${c.name.toLowerCase()} cho ngành thực phẩm, giúp tối ưu sản xuất và nâng cao hiệu suất.`;

  const url = c.canonicalUrl || abs(`/${c.slug}`);
  const ogImage = absImage(c.ogImage || c.banner);

  return {
    title: brandTitle(title),
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: ogImage }],
    },
    robots: {
      index: !c.noindex,
      follow: !c.nofollow,
    },
  };
}

/* ================= PAGE ================= */
export default async function CategoryPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const c = await prisma.category.findUnique({
    where: { slug },
  });

  if (!c) {
    const r = await prisma.slugRedirect.findUnique({
      where: { fromSlug: slug },
    });

    if (r?.entityType === "category") {
      redirect(`/${r.toSlug}`);
    }

    notFound();
  }

  // ==========================
  // Lấy category con
  // ==========================
  const children = await prisma.category.findMany({
    where: {
      parentId: c.id,
    },
    orderBy: [
      { order: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
  });

  // ==========================
  // Danh mục cho dropdown menu: TOÀN BỘ danh mục có sản phẩm trên site
  // (giống hệt trang /san-pham, không giới hạn theo nhóm cha)
  // ==========================
  const allCategories = await prisma.category.findMany({
    where: {
      products: { some: { published: true } },
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  // ==========================
  // Lấy product
  // ==========================
  const categoryIds =
    children.length > 0
      ? children.map((x) => x.id)
      : [c.id];

  const products = await prisma.product.findMany({
    where: {
      published: true,
      noindex: false,
      categoryId: {
        in: categoryIds,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      coverImage: true,
      short: true,
      isFeatured: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Banner tự động: 1 máy chính (ưu tiên máy đánh dấu "Nổi bật" trong admin, không có thì máy mới nhất)
  // + tối đa 3 máy phụ. Chỉ lấy máy có ảnh.
  const withImg = products.filter((p) => p.coverImage);
  const heroProduct = withImg.find((p) => p.isFeatured) || withImg[0];
  const sideProducts = withImg.filter((p) => p.id !== heroProduct?.id).slice(0, 3);
  // Lớp ảnh dùng chung: nền xám nhạt của ảnh gốc → trắng, hoà vào khung
  const imgCls = "object-contain mix-blend-multiply [filter:brightness(1.05)_contrast(1.05)]";

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbJsonLd([
              { name: "Trang chủ", path: "/" },
              { name: "Sản phẩm", path: "/san-pham" },
              { name: c.name, path: `/${c.slug}` },
            ])
          ),
        }}
      />

      {/* ===== TIÊU ĐỀ DANH MỤC ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pt-10 md:px-8 md:pt-14">
        <nav aria-label="Breadcrumb" className="text-[14px] text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-ink)]">Trang chủ</Link>
          <span className="px-2">/</span>
          <Link href="/san-pham" className="hover:text-[var(--color-ink)]">Sản phẩm</Link>
          <span className="px-2">/</span>
          <span className="text-[var(--color-ink)]">{c.name}</span>
        </nav>

        <div className="mt-8 grid items-end gap-8 pb-10 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <span className="eyebrow">Dòng máy</span>
            <h1 className="display-xl text-[clamp(38px,5.6vw,80px)]">{c.name}</h1>
          </div>
          <p className="max-w-[460px] text-[16px] leading-relaxed text-[var(--color-muted)] md:justify-self-end">
            {c.metaDescription ||
              `MCBROTHER cung cấp ${c.name.toLowerCase()} cho ngành thực phẩm, giúp tối ưu sản xuất và nâng cao hiệu suất.`}
          </p>
        </div>

        {/* ===== BANNER TỰ ĐỘNG: 1 máy chính trên "sân khấu" + các máy phụ ===== */}
        {heroProduct && (
          <div className="mb-12 grid overflow-hidden rounded-[24px] bg-white md:rounded-[32px] lg:grid-cols-[1.45fr_1fr]">
            {/* MÁY CHÍNH */}
            <Link
              href={`/san-pham/${heroProduct.slug}`}
              className="group relative flex min-h-[300px] flex-col justify-between p-6 md:min-h-[440px] md:p-10"
            >
              <div className="relative z-10 max-w-[70%]">
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  Máy tiêu biểu
                </div>
                <div className="mt-2 font-display text-[clamp(20px,2.2vw,30px)] font-semibold leading-[1.15] tracking-[-0.025em] [text-wrap:balance]">
                  {heroProduct.name}
                </div>
              </div>

              {/* ảnh + bóng đổ dưới chân máy */}
              <div className="relative mx-auto mt-4 [aspect-ratio:4/3] w-full max-w-[560px]">
                <div className="absolute bottom-[6%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%] bg-[#E6E2D9] blur-[2px]" />
                <Image
                  src={heroProduct.coverImage as string}
                  alt={heroProduct.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 90vw"
                  className={`${imgCls} transition duration-700 group-hover:scale-[1.03]`}
                />
              </div>

              <span className="relative z-10 mt-4 text-[15px] font-medium group-hover:text-[var(--color-primary)]">
                Xem chi tiết →
              </span>
            </Link>

            {/* CỘT PHẢI: thông tin + máy phụ */}
            <div className="flex flex-col border-t border-[var(--color-line)] bg-[#FBFAF7] p-6 md:p-10 lg:border-l lg:border-t-0">
              <div className="flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-6">
                <div>
                  <div className="font-display text-[44px] font-semibold leading-none tracking-[-0.04em]">{products.length}</div>
                  <div className="mt-1.5 text-[14px] text-[var(--color-muted)]">dòng máy · báo giá trong ngày</div>
                </div>
                <a href="#danh-sach" className="btn-pill-dark min-h-[44px] shrink-0 px-5 text-[14px] font-medium">
                  Xem tất cả ↓
                </a>
              </div>

              {sideProducts.length > 0 && (
                <ul className="flex-1 divide-y divide-[var(--color-line)]">
                  {sideProducts.map((p, i) => (
                    <li key={p.id} className={i >= 2 ? "hidden lg:block" : ""}>
                      <Link href={`/san-pham/${p.slug}`} className="group flex items-center gap-4 py-4">
                        <div className="relative h-20 w-20 shrink-0 rounded-2xl bg-white md:h-24 md:w-24">
                          <Image src={p.coverImage as string} alt={p.name} fill sizes="96px" className={`${imgCls} p-1.5`} />
                        </div>
                        <span className="line-clamp-2 flex-1 text-[15px] font-medium leading-snug group-hover:text-[var(--color-primary)]">
                          {p.name}
                        </span>
                        <span aria-hidden className="text-[var(--color-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)]">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ===== THANH CHỌN DÒNG MÁY ===== */}
      {allCategories.length > 0 && (
        <CategoryMegaMenu categories={allCategories} label="Chọn dòng máy" mode="link" />
      )}

      {/* ===== SẢN PHẨM ===== */}
      <section id="danh-sach" className="mx-auto max-w-[1320px] scroll-mt-40 px-4 py-14 md:px-8 md:py-20">
        {products.length > 0 ? (
          <>
            <div className="mb-8 text-[15px] text-[var(--color-muted)]">{products.length} sản phẩm</div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-[24px] bg-[var(--color-sand)] px-6 py-16 text-center text-[var(--color-muted)]">
            Chưa có sản phẩm trong danh mục này. Gọi{" "}
            <a href="tel:0834551888" className="font-semibold text-[var(--color-ink)]">0834 551 888</a> để được tư vấn.
          </div>
        )}
      </section>

    </main>
  );
}