// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TickerBar from "@/components/TickerBar";
import FeaturedSlider from "@/components/FeaturedSlider";
import WatermarkImage from "@/components/WatermarkImage";

import { cache } from "react";
import { PhoneCall, Settings, TrendingUp, Truck, Zap } from "lucide-react";

export const revalidate = 60;
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mcbrother.com.vn";

export const metadata: Metadata = {
  title:
    "Máy chế biến & đóng gói thực phẩm công nghiệp | MCBROTHER",

  description:
    "MCBROTHER cung cấp máy chế biến thực phẩm, máy đóng gói, máy chiết rót, máy hút chân không, máy dán nhãn, máy co màng, máy in date, dây chuyền sản xuất và giải pháp tự động hóa cho doanh nghiệp trên toàn quốc.",

  keywords: [
    "máy chế biến thực phẩm",
    "máy đóng gói",
    "máy đóng gói công nghiệp",
    "máy chiết rót",
    "máy hút chân không",
    "máy dán nhãn",
    "máy co màng",
    "máy in date",
    "dây chuyền chế biến thực phẩm",
    "dây chuyền đóng gói",
    "thiết bị chế biến thực phẩm",
    "máy thực phẩm",
    "MCBROTHER",
  ],

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "MCBROTHER JSC",

    title:
      "MCBROTHER JSC | Máy chế biến thực phẩm & máy đóng gói công nghiệp",

    description:
      "Chuyên cung cấp máy chế biến thực phẩm, máy đóng gói, dây chuyền sản xuất và giải pháp tự động hóa cho doanh nghiệp trên toàn quốc.",

    locale: "vi_VN",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

function fmtVND(n?: number | null) {
  if (typeof n !== "number") return "Liên hệ";
  try {
    return new Intl.NumberFormat("vi-VN").format(n) + "₫";
  } catch {
    return "Liên hệ";
  }
}

/* ================= DATA ================= */

// 🔥 cache toàn bộ homepage
const getHomepageData = cache(async () => {
  const [
    featured,
    categoriesHome,
    categories,
    posts,
  ] = await Promise.all([

    prisma.product.findMany({
      where: { published: true, isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        slug: true,
        name: true,
        short: true,
        coverImage: true,
        price: true,
      },
    }),

    prisma.category.findMany({
      where: { isFeatured: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        banner: true,
        ogImage: true,
        metaDescription: true,
      },
    }),

    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),

    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        excerpt: true,
        createdAt: true,
        category: {
          select: { name: true },
        },
      },
    }),
  ]);

  // 🔥 fallback nếu không có featured
  let products = featured;

  if (featured.length === 0) {
    products = await prisma.product.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        slug: true,
        name: true,
        short: true,
        coverImage: true,
        price: true,
      },
    });
  }

  return {
    products,
    categories,
    categoriesHome,
    posts,
  };
});

export default async function HomePage() {
  const { products, categories, categoriesHome, posts } = await getHomepageData();
  return (
    <main className="bg-[var(--color-bg)] text-slate-800">
      {/* hero */}
      <section className="relative h-[520px] flex items-center overflow-hidden">

        {/* BACKGROUND */}
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: "url('https://res.cloudinary.com/ds55hfvx4/image/upload/v1774489339/hero_banner_u2ziwq.png')",
            backgroundSize: "cover",              // ✅ QUAN TRỌNG
            backgroundPosition: "right bottom",   // ✅ GIỮ MÁY BÊN PHẢI
          }}
        />

        {/* OVERLAY NHẸ (optional) */}
        <div className="absolute inset-0 bg-gradient-to-r 
          from-white/90 
          via-white/70 
          to-transparent" />

        {/* CONTENT */}
        <div className="relative max-w-7xl mx-auto w-full px-4">
          <div className="max-w-2xl">

            <h1 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
              Máy chế biến thực phẩm &
              <br />
              máy đóng gói công nghiệp
            </h1>

            {/* Mobile */}
            <p className="mt-5 text-base leading-7 text-gray-700 md:hidden">
              MCBROTHER cung cấp máy chế biến thực phẩm, máy đóng gói và dây
              chuyền sản xuất. Tư vấn, lắp đặt và bảo hành trên toàn quốc.
            </p>

            {/* Desktop */}
            <p className="mt-5 hidden md:block text-lg leading-8 text-gray-700">
              MCBROTHER chuyên cung cấp máy chế biến thực phẩm, máy đóng gói,
              máy chiết rót, máy hút chân không, máy dán nhãn, máy co màng,
              dây chuyền sản xuất và giải pháp tự động hóa cho doanh nghiệp
              trên toàn quốc.
            </p>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                <span>10+ năm kinh nghiệm</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                <span>1.200+ khách hàng</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                <span>Giao hàng & lắp đặt toàn quốc</span>
              </div>
            </div>

            <a
              href="/lien-he"
              className="inline-flex mt-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-7 py-3 rounded-lg font-medium transition"
            >
              Nhận báo giá ngay
            </a>

          </div>
        </div>

      </section>

      <section className="py-14">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">

          {/* TITLE */}
          <h2 className="text-[20px] font-semibold text-center mb-2">
            Thiết bị & máy móc ngành thực phẩm
          </h2>

          {/* SUBTEXT (AI rất cần) */}
          <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto mb-8">
            MCBROTHER cung cấp các dòng máy đóng gói, máy chiết rót và thiết bị chế biến
            giúp doanh nghiệp tối ưu quy trình sản xuất và nâng cao hiệu suất vận hành.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {categoriesHome.map((cat) => (
              <div
                key={cat.id}
                className="group bg-white border border-gray-200 rounded overflow-hidden transition duration-300 hover:shadow-md hover:-translate-y-1"
              >
                {/* IMAGE */}
                <div className="relative h-56 bg-gray-200 overflow-hidden">
                  <WatermarkImage
                    src={cat.ogImage || cat.banner || "/images/no-image.png"}
                    alt={`${cat.name} MCBROTHER`}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                    watermarkSize={44}
                    position="bottom-right"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition pointer-events-none" />
                </div>

                {/* CONTENT */}
                <div className="p-6">
                  <h3 className="text-[var(--color-primary)] font-semibold text-base mb-1">
                    {cat.name}
                  </h3>

                  <p className="text-sm text-gray-600 leading-snug line-clamp-2">
                    {cat.metaDescription ||
                      `MCBROTHER cung cấp ${cat.name.toLowerCase()} cho ngành thực phẩm, 
                giúp tối ưu quy trình sản xuất và nâng cao năng suất.`}
                  </p>

                  <Link href={`/${cat.slug}`}>
                    <button className="mt-4 w-full bg-[var(--color-primary)] text-white py-2 text-base font-semibold transition hover:bg-[var(--color-primary-dark)]">
                      Xem chi tiết →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ===== FEATURED PRODUCTS ===== */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">
          <FeaturedSlider
            items={products}
            title="Sản phẩm nổi bật"
          />
        </div>
      </section>

      {/* <section className="py-12 bg-gray-50 text-center">
  <p className="text-lg italic text-gray-700 max-w-2xl mx-auto">
    "Giải pháp phù hợp cho doanh nghiệp sản xuất – dễ triển khai và tối ưu hiệu suất."
  </p>
</section> */}

      {/* ===== SOLUTION ===== */}
      <div className="bg-gradient-to-r from-[#1fa2a6] to-[#2bb3b8] text-white py-14">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">

          {/* LEFT */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Giải pháp trọn gói cho nhà máy của bạn
            </h2>

            <p className="text-white/90 mb-6">
              Tư vấn – thiết kế – lắp đặt dây chuyền sản xuất phù hợp với nhu cầu thực tế
            </p>

            <ul className="space-y-3 text-sm">

              <li className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-300" />
                Thiết kế theo yêu cầu
              </li>

              <li className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-yellow-300" />
                Lắp đặt tận nơi
              </li>

              <li className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-yellow-300" />
                Tư vấn miễn phí 24/7
              </li>

            </ul>

            {/* BUTTON */}
            <div className="mt-6 flex gap-3">
              <a
                href="/lien-he"
                className="px-6 py-3 rounded-lg bg-white text-[var(--color-primary)] font-semibold hover:bg-gray-100 transition"
              >
                Nhận báo giá
              </a>

              <a
                href="tel:0900000000"
                className="px-6 py-3 rounded-lg border border-white/50 hover:bg-white/10 transition"
              >
                Gọi ngay
              </a>
            </div>
          </div>

          {/* RIGHT (optional image) */}
          <div className="hidden md:block relative">

            {/* glow nền */}
            <div className="absolute -inset-4 bg-white/10 rounded-2xl blur-2xl"></div>

            {/* image */}
            <img
              src="https://res.cloudinary.com/ds55hfvx4/image/upload/v1774664686/banner2_en4elx.jpg"
              alt="solution"
              className="relative z-10 w-full max-h-[260px] object-cover 
    rounded-2xl shadow-xl"
            />

          </div>

        </div>
      </div>

      {/* ===== BLOG ===== */}
<section className="py-16 bg-white">
  <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">

    {/* Heading */}
    <div className="text-center max-w-2xl mx-auto mb-10">

      <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        Blog
      </span>

      <h2 className="mt-3 text-3xl font-bold text-gray-900">
        Tin tức & Kiến thức ngành thực phẩm
      </h2>

      <p className="mt-3 text-gray-600 leading-7">
        Cập nhật kiến thức, kinh nghiệm lựa chọn máy móc và giải pháp tối ưu
        dây chuyền chế biến, đóng gói thực phẩm cho doanh nghiệp.
      </p>

    </div>

    {/* Blog Grid */}
    <div className="grid gap-6 md:grid-cols-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-lg"
        >
          {/* Image */}
          <Link href={`/tin-tuc/${post.slug}`}>
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={post.coverImage || "/no-image.png"}
                alt={post.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            </div>
          </Link>

          {/* Content */}
          <div className="p-5">

            <div className="text-xs text-gray-400">
              {post.category?.name || "Tin tức"} •{" "}
              {new Date(post.createdAt).toLocaleDateString("vi-VN")}
            </div>

            <h3 className="mt-3 text-lg font-semibold text-gray-900 line-clamp-2">
              {post.title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-gray-600 line-clamp-3">
              {post.excerpt || "Đang cập nhật nội dung..."}
            </p>

            <Link
              href={`/tin-tuc/${post.slug}`}
              className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--color-primary)] hover:gap-3 transition-all"
            >
              Xem chi tiết
              <span>→</span>
            </Link>

          </div>
        </article>
      ))}
    </div>

    {/* Button */}
    <div className="mt-10 text-center">
      <Link
        href="/tin-tuc"
        className="inline-flex items-center rounded-lg border border-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
      >
        Xem tất cả bài viết
      </Link>
    </div>

  </div>
</section>

      {/* ===== CTA ===== */}
      <section className="bg-[var(--color-primary)] text-white text-center py-14">
        <h3 className="text-[22px] font-semibold">
          Cần tư vấn giải pháp phù hợp?
        </h3>

        <Link
          href="/lien-he"
          className="inline-block mt-4 bg-white text-black px-6 py-2 rounded text-base font-semibold hover:bg-gray-100 transition"
        >
          Liên hệ ngay
        </Link>
      </section>

    </main>
  );
}