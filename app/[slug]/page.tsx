// app/[slug]/page.tsx — trang danh mục sản phẩm (URL: /<slug-danh-muc>)

import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import { prisma } from "@/lib/prisma";
import { abs } from "@/lib/site";
import { brandTitle, metaDescription, absImage, breadcrumbJsonLd, ldJson } from "@/lib/seo";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
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
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <main className="bg-[var(--color-bg)] text-slate-800">
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

      <section className="relative h-[320px] md:h-[420px] overflow-hidden bg-[#25282c]">
  <Image
    src={c.banner || "/images/banner2.JPG"}
    alt={c.name}
    fill
    priority
    sizes="100vw"
    className="
      object-cover
      object-center
      md:object-right
    "
  />

  <div className="absolute inset-0 bg-black/5" />

  <div
    className="
      relative
      h-full
      max-w-7xl
      xl:max-w-[1280px]
      mx-auto
      px-4
      flex
      items-center
      justify-center
      text-center
      text-white
    "
  >
    <div className="max-w-2xl">

      <h1 className="text-[28px] md:text-[36px] font-semibold">
        {c.name}
      </h1>

      <p className="mt-3 text-sm md:text-base text-white/85">
        {c.metaDescription ||
          `MCBROTHER cung cấp ${c.name.toLowerCase()} cho ngành thực phẩm, giúp tối ưu sản xuất và nâng cao hiệu suất.`}
      </p>

    </div>
  </div>

</section>

      {/* ===== DROPDOWN CHỌN DÒNG MÁY (đồng bộ mega-menu với /san-pham) ===== */}
      {allCategories.length > 0 && (
        <CategoryMegaMenu
          categories={allCategories}
          label="Chọn dòng máy"
          mode="link"
        />
      )}

      <section className="py-12">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">

          {products.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 italic">
              Chưa có sản phẩm trong danh mục này
            </div>
          )}

        </div>
      </section>

    </main>
  );
}