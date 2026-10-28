// app/page.tsx — Trang chủ (giao diện "cao cấp tối giản")
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeaturedSlider from "@/components/FeaturedSlider";
import WatermarkImage from "@/components/WatermarkImage";
import { cld } from "@/lib/cloudinary";
import { SITE } from "@/lib/site";
import { formatPrice, hasPrice } from "@/lib/price";
import { cache } from "react";

export const revalidate = 60;
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mcbrother.com.vn";

export const metadata: Metadata = {
  title: "Máy chế biến & đóng gói thực phẩm công nghiệp | MCBROTHER",

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
    title: "MCBROTHER JSC | Máy chế biến thực phẩm & máy đóng gói công nghiệp",
    description:
      "Chuyên cung cấp máy chế biến thực phẩm, máy đóng gói, dây chuyền sản xuất và giải pháp tự động hóa cho doanh nghiệp trên toàn quốc.",
    locale: "vi_VN",
    images: [{ url: "/public/images/logo.png", width: 1200, height: 630, alt: "MCBROTHER JSC" }],
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

/* ================= DATA ================= */

// cache toàn bộ dữ liệu trang chủ
const getHomepageData = cache(async () => {
  const [featured, categoriesHome, posts] = await Promise.all([
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

  // fallback nếu chưa đánh dấu sản phẩm nổi bật
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
    categoriesHome,
    posts,
  };
});

/* ================= NỘI DUNG CỐ ĐỊNH ================= */

const STATS = [
  { value: "10+", label: "năm trong ngành" },
  { value: "1.200+", label: "khách hàng tin dùng" },
  { value: "Toàn quốc", label: "giao hàng & lắp đặt" },
  { value: "24/7", label: "tư vấn miễn phí" },
];

const STEPS = [
  { n: "01", title: "Khảo sát", desc: "Tìm hiểu sản phẩm, sản lượng và mặt bằng thực tế của bạn." },
  { n: "02", title: "Tư vấn & báo giá", desc: "Đề xuất thiết bị đúng công suất, không dư thừa." },
  { n: "03", title: "Lắp đặt & chạy thử", desc: "Lắp đặt tận nơi, chạy thử và hướng dẫn vận hành." },
  { n: "04", title: "Bảo hành & bảo trì", desc: "Hỗ trợ kỹ thuật, linh kiện thay thế luôn sẵn có." },
];

// Màu nền xen kẽ cho khung ảnh danh mục
const TONES = ["bg-[var(--color-sand)]", "bg-[#1C1B19]", "bg-[#E3E6E2]"];

function firstLine(s?: string | null) {
  return s?.split("\n").map((x) => x.trim()).filter(Boolean)[0] || null;
}

export default async function HomePage() {
  const { products, categoriesHome, posts } = await getHomepageData();
  const hero = products.find((p) => p.coverImage) || products[0];

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* ===== HERO ===== */}
      <section className="mx-auto flex max-w-[1320px] flex-col items-center gap-7 px-4 pt-14 text-center md:px-8 md:pt-20">
        <span className="eyebrow">Máy chế biến & đóng gói · Từ 2013</span>
        <h1 className="display-xl max-w-[1100px] text-[clamp(44px,7.4vw,104px)]">
          Máy chế biến thực phẩm
          <br />
          <span className="text-[#8C877D]">&amp; máy đóng gói công nghiệp</span>
        </h1>
        <p className="max-w-[640px] text-[17px] leading-relaxed text-[var(--color-muted)] md:text-[19px]">
          MCBROTHER cung cấp máy chế biến thực phẩm, máy đóng gói, máy chiết rót, máy hút chân không,
          máy dán nhãn và dây chuyền sản xuất. Tư vấn, lắp đặt và bảo hành trên toàn quốc.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/san-pham" className="btn-pill-primary min-h-[54px] px-8 text-[16px]">
            Khám phá sản phẩm
          </Link>
          <Link href="/lien-he" className="btn-pill-outline min-h-[54px] px-8 text-[16px]">
            Nhận báo giá ngay
          </Link>
        </div>
      </section>

      {/* ===== SẢN PHẨM NỔI BẬT: chữ bên trái, ảnh bên phải (mobile: ảnh trên, chữ dưới) ===== */}
      {hero && (
        <section className="mx-auto max-w-[1320px] px-4 pt-14 md:px-8">
          <Link
            href={`/san-pham/${hero.slug}`}
            className="group grid items-center gap-6 overflow-hidden rounded-[32px] bg-white p-6 md:grid-cols-[1fr_1.35fr] md:gap-10 md:p-12 lg:p-16"
          >
            {/* ẢNH */}
            <div className="flex [aspect-ratio:4/3] items-center justify-center md:order-2">
              {hero.coverImage ? (
                <WatermarkImage
                  src={cld(hero.coverImage, 1200) ?? hero.coverImage}
                  alt={hero.name}
                  loading="eager"
                  wrapperClassName="flex h-full w-full items-center justify-center"
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition duration-700 group-hover:scale-[1.03]"
                  watermarkSize={40}
                  position="bottom-right"
                  opacity={0.45}
                />
              ) : null}
            </div>

            {/* CHỮ */}
            <div className="flex flex-col items-start gap-5 md:order-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Sản phẩm nổi bật
              </span>
              <h2 className="display-lg text-[clamp(28px,3.4vw,48px)] [text-wrap:balance]">{hero.name}</h2>
              {firstLine(hero.short) && (
                <p className="text-[17px] text-[var(--color-muted)]">{firstLine(hero.short)}</p>
              )}
              <div className="mt-2 w-full border-t border-[var(--color-line)] pt-5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Giá</span>
                <div className="mt-1 font-display text-[clamp(22px,2.2vw,30px)] font-semibold tracking-[-0.02em] text-[var(--color-primary)]">
                  {hasPrice(hero.price) ? formatPrice(hero.price) : "Liên hệ báo giá"}
                </div>
              </div>
              <span className="btn-pill-dark mt-2">Xem chi tiết →</span>
            </div>
          </Link>
        </section>
      )}

      {/* ===== SỐ LIỆU ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pt-10 md:px-8">
        <div className="grid grid-cols-2 border-t border-[var(--color-line)] md:flex md:justify-between md:gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="py-7">
              <div className="font-display text-[clamp(32px,3.6vw,48px)] font-semibold tracking-[-0.04em]">{s.value}</div>
              <div className="mt-1 text-[15px] text-[var(--color-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DANH MỤC (xếp so le trái / phải) ===== */}
      {categoriesHome.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pt-24 md:px-8 md:pt-32">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[760px] space-y-4">
              <span className="eyebrow">Danh mục</span>
              <h2 className="display-lg text-[clamp(34px,4.6vw,64px)]">
                Thiết bị & máy móc ngành thực phẩm
              </h2>
            </div>
            <p className="max-w-[420px] text-[16px] leading-relaxed text-[var(--color-muted)]">
              Máy đóng gói, máy chiết rót và thiết bị chế biến giúp doanh nghiệp tối ưu quy trình sản xuất
              và nâng cao hiệu suất vận hành.
            </p>
          </div>

          <div className="flex flex-col">
            {categoriesHome.map((cat, i) => {
              const img = cld(cat.ogImage || cat.banner, 900, 675, "fill") || "/images/no-image.jpg";
              return (
                <Link
                  key={cat.id}
                  href={`/${cat.slug}`}
                  className={`group flex flex-col gap-8 border-t border-[var(--color-line)] py-8 md:items-center md:gap-14 ${
                    i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                  }`}
                >
                  <div className={`[aspect-ratio:4/3] w-full overflow-hidden rounded-[28px] md:w-[52%] ${TONES[i % TONES.length]}`}>
                    <WatermarkImage
                      src={img}
                      alt={`${cat.name} MCBROTHER`}
                      wrapperClassName="h-full w-full"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      watermarkSize={40}
                      position="bottom-right"
                      opacity={0.45}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-5">
                    <span className="eyebrow">{String(i + 1).padStart(2, "0")} — Danh mục</span>
                    <h3 className="display-lg text-[clamp(30px,3.2vw,46px)]">{cat.name}</h3>
                    <p className="max-w-[460px] text-[17px] leading-relaxed text-[var(--color-muted)]">
                      {cat.metaDescription ||
                        `MCBROTHER cung cấp ${cat.name.toLowerCase()} cho ngành thực phẩm, giúp tối ưu quy trình sản xuất và nâng cao năng suất.`}
                    </p>
                    <span className="btn-pill-outline self-start">Xem dòng máy →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== SẢN PHẨM NỔI BẬT ===== */}
      {products.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pt-24 md:px-8 md:pt-32">
          <FeaturedSlider items={products} title="Sản phẩm nổi bật" />
        </section>
      )}

      {/* ===== GIẢI PHÁP TRỌN GÓI (khối đen) ===== */}
      <section className="mt-24 bg-[var(--color-ink)] text-[var(--color-bg)] md:mt-32">
        <div className="mx-auto max-w-[1320px] px-4 py-24 md:px-8 md:py-32">
          <div className="grid items-end gap-10 md:grid-cols-2">
            <h2 className="display-lg text-[clamp(34px,4.6vw,64px)]">
              Giải pháp trọn gói
              <br />
              <span className="text-[#8F8A80]">cho nhà máy của bạn.</span>
            </h2>
            <div className="space-y-6 md:justify-self-end">
              <p className="max-w-[440px] text-[17px] leading-relaxed text-[#B5B0A6]">
                Tư vấn – thiết kế – lắp đặt dây chuyền sản xuất phù hợp với nhu cầu thực tế. Thiết kế theo
                yêu cầu, lắp đặt tận nơi, tư vấn miễn phí 24/7.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/lien-he" className="btn-pill-primary">Nhận báo giá</Link>
                <a href={`tel:${SITE.phone}`} className="btn-pill border border-white/40 font-medium text-white hover:bg-white hover:text-[var(--color-ink)]">
                  Gọi {SITE.phoneDisplay}
                </a>
              </div>
            </div>
          </div>

          <ol className="mt-16 grid border-t border-[#3A3833] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3 py-8 pr-8">
                <span className="font-display text-[15px] text-[#5FC3CF]">{s.n}</span>
                <h3 className="font-display text-[24px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-[#B5B0A6]">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== KIẾN THỨC ===== */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 py-24 md:px-8 md:py-32">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-4">
              <span className="eyebrow">Kiến thức</span>
              <h2 className="display-lg text-[clamp(34px,4.6vw,64px)]">
                Tin tức & kiến thức
                <br />
                <span className="text-[#8C877D]">ngành thực phẩm.</span>
              </h2>
            </div>
            <Link href="/tin-tuc" className="link-underline">Xem tất cả bài viết</Link>
          </div>

          <div className="grid gap-x-7 gap-y-14 md:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/tin-tuc/${post.slug}`} className="group flex flex-col gap-4">
                <div className="[aspect-ratio:4/3] overflow-hidden rounded-[24px] bg-[var(--color-sand)]">
                  <img
                    src={cld(post.coverImage, 640, 480, "fill") || "/images/no-image.jpg"}
                    loading="lazy"
                    alt={post.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  {post.category?.name || "Tin tức"} · {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                </div>
                <h3 className="line-clamp-2 font-display text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] group-hover:text-[var(--color-primary)]">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="line-clamp-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{post.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== KÊU GỌI LIÊN HỆ ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pb-24 md:px-8 md:pb-32">
        <div className="flex flex-col justify-between gap-10 rounded-[32px] bg-[var(--color-primary)] p-[clamp(32px,6vw,88px)] text-white md:flex-row md:items-end">
          <h2 className="display-lg max-w-[680px] text-[clamp(34px,4.6vw,64px)]">
            Cần chọn máy?
            <br />
            Gọi chúng tôi.
          </h2>
          <div className="flex flex-col items-start gap-4">
            <a href={`tel:${SITE.phone}`} className="font-display text-[clamp(28px,3vw,40px)] font-semibold tracking-[-0.02em]">
              {SITE.phoneDisplay}
            </a>
            <div className="flex flex-wrap gap-3">
              <Link href="/lien-he" className="btn-pill bg-white text-[var(--color-ink)] hover:bg-[var(--color-bg)]">
                Gửi yêu cầu báo giá
              </Link>
              <a href={SITE.zaloUrl} target="_blank" rel="noopener" className="btn-pill border border-white font-medium text-white hover:bg-white/10">
                Nhắn Zalo
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}