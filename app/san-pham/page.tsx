// app/san-pham/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sản phẩm – Máy chế biến & đóng gói thực phẩm",
  description:
    "Danh mục máy chế biến thực phẩm, máy đóng gói, máy hút chân không, máy co màng, máy in date, máy chiết rót… chính hãng từ MCBROTHER. Báo giá nhanh, lắp đặt tận nơi.",
  alternates: { canonical: "/san-pham" },
  openGraph: {
    title: "Sản phẩm | MCBROTHER",
    description:
      "Máy chế biến & đóng gói thực phẩm chính hãng, lắp đặt tận nơi, bảo hành chính hãng.",
    url: "/san-pham",
  },
};

export const runtime = "nodejs";
export const revalidate = 60;

const SAMPLE_PER_CATEGORY = 4;

/* ================= DATA ================= */

async function getCategoriesWithSamples() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const withProducts = await Promise.all(
    categories.map(async (cat) => {
      const items = await prisma.product.findMany({
        where: { categoryId: cat.id, published: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: SAMPLE_PER_CATEGORY,
        select: {
          id: true,
          slug: true,
          name: true,
          coverImage: true,
          price: true,
          short: true,
        },
      });

      return { ...cat, items };
    })
  );

  // chỉ giữ danh mục có ít nhất 1 sản phẩm
  return withProducts.filter((c) => c.items.length > 0);
}

/* ================= PAGE ================= */
export default async function ProductsPage() {
  const categories = await getCategoriesWithSamples();

  return (
    <main className="bg-[var(--color-bg)] text-slate-800">

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden min-h-[340px]">
        <img
          src="https://res.cloudinary.com/ds55hfvx4/image/upload/f_auto,q_auto,c_limit,w_1920/v1784716674/banner_may_moc_cong_nghiep_fa8smo.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/55 to-slate-900/20" />

        <div className="relative max-w-7xl xl:max-w-[1280px] mx-auto px-4 min-h-[340px] flex items-center">
          <div className="max-w-2xl text-white">
            <p className="text-cyan-300 font-medium mb-3">Thiết bị công nghiệp</p>
            <h1 className="text-[44px] md:text-[56px] leading-tight font-bold">
              Tất cả sản phẩm
            </h1>
            <p className="mt-5 text-white/80 text-lg leading-relaxed">
              Giải pháp máy chế biến — đóng gói tối ưu cho doanh nghiệp sản xuất thực phẩm.
            </p>
          </div>
        </div>
      </section>

      {/* ===== QUICK NAV: DROPDOWN DANH MỤC ===== */}
      <CategoryMegaMenu categories={categories} />

      {/* ===== CONTENT: GOM NHÓM THEO DANH MỤC ===== */}
      <section className="py-10">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4 space-y-14">

          {categories.length === 0 ? (
            <div className="text-gray-500">Chưa có sản phẩm.</div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} id={`cat-${cat.slug}`} className="scroll-mt-40">

                {/* HEADER DANH MỤC */}
                <div className="flex items-end justify-between mb-5">
                  <h2 className="text-[22px] md:text-[26px] font-semibold text-[var(--color-primary-dark)]">
                    {cat.name}
                  </h2>

                  <Link
                    href={`/${cat.slug}`}
                    className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition shrink-0"
                  >
                    Xem thêm
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* GRID SẢN PHẨM MẪU */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {cat.items.map((p) => (
                    <ProductCard key={p.id} p={{ ...p, category: { id: cat.id, name: cat.name } }} />
                  ))}
                </div>

              </div>
            ))
          )}

        </div>
      </section>
    </main>
  );
}