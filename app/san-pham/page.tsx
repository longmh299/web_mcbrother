// app/san-pham/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
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
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* ===== TIÊU ĐỀ ===== */}
      <section className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-4 pb-10 pt-14 md:px-8 md:pt-20">
        <div className="space-y-5">
          <span className="eyebrow">Sản phẩm</span>
          <h1 className="display-xl text-[clamp(40px,6vw,84px)]">Tất cả sản phẩm</h1>
        </div>
        <p className="max-w-[420px] text-[16px] leading-relaxed text-[var(--color-muted)]">
          Giải pháp máy chế biến — đóng gói tối ưu cho doanh nghiệp sản xuất thực phẩm. Gọi hoặc gửi yêu cầu
          để nhận báo giá trong ngày.
        </p>
      </section>

      {/* ===== THANH DANH MỤC ===== */}
      <CategoryMegaMenu categories={categories} />

      {/* ===== GOM NHÓM THEO DANH MỤC ===== */}
      <section className="mx-auto max-w-[1320px] space-y-20 px-4 py-14 md:px-8 md:py-20">
        {categories.length === 0 ? (
          <div className="text-[var(--color-muted)]">Chưa có sản phẩm.</div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} id={`cat-${cat.slug}`} className="scroll-mt-40">
              <div className="mb-8 flex items-end justify-between gap-4 border-t border-[var(--color-line)] pt-6">
                <h2 className="display-lg text-[clamp(28px,3.2vw,44px)]">{cat.name}</h2>
                <Link href={`/${cat.slug}`} className="link-underline shrink-0">
                  Xem tất cả
                </Link>
              </div>

              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.items.map((p) => (
                  <ProductCard key={p.id} p={{ ...p, category: { id: cat.id, name: cat.name } }} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* ===== KÊU GỌI TƯ VẤN ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pb-24 md:px-8">
        <div className="flex flex-col justify-between gap-8 rounded-[32px] bg-[var(--color-ink)] p-[clamp(32px,5vw,72px)] text-[var(--color-bg)] md:flex-row md:items-center">
          <h2 className="display-lg max-w-[620px] text-[clamp(28px,3.6vw,48px)]">
            Chưa biết chọn máy nào?
            <br />
            <span className="text-[#8F8A80]">Kỹ thuật viên tư vấn miễn phí.</span>
          </h2>
          <a href="tel:0834551888" className="btn-pill-primary min-h-[54px] px-8 text-[16px]">
            Gọi 0834 551 888
          </a>
        </div>
      </section>
    </main>
  );
}
