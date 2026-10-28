// components/Footer.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE, abs } from "@/lib/site";
import { ldJson } from "@/lib/seo";

const socials = [
  {
    key: "ytb",
    label: "YouTube",
    href: SITE.youtubeUrl,
    path: "M23.5 6.2a4 4 0 0 0-2.8-2.8C18.9 3 12 3 12 3s-6.9 0-8.7.4A4 4 0 0 0 .5 6.2 41 41 0 0 0 0 12a41 41 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.8C5.1 21 12 21 12 21s6.9 0 8.7-.4a4 4 0 0 0 2.8-2.8A41 41 0 0 0 24 12a41 41 0 0 0-.5-5.8zM9.5 15.5v-7L16 12l-6.5 3.5z",
  },
  {
    key: "fb",
    label: "Facebook",
    href: SITE.facebookUrl,
    path: "M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.7c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z",
  },
  {
    key: "tt",
    label: "TikTok",
    href: SITE.tiktokUrl,
    path: "M16 8.3a6 6 0 0 0 4 1.5V13a9 9 0 0 1-4-.9v4.3a5.5 5.5 0 1 1-5.5-5.5c.2 0 .4 0 .6.1v3a2.5 2.5 0 1 0 1.9 2.4V3h3v5.3z",
  },
];

/** "NGÀNH DƯỢC , MỸ PHẨM" → "Ngành dược, mỹ phẩm" (tên nhập toàn chữ hoa trong admin) */
function niceName(name: string) {
  const clean = name.replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  if (clean !== clean.toLocaleUpperCase("vi")) return clean;
  const lower = clean.toLocaleLowerCase("vi");
  return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1);
}

async function getFooterCategories() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 5,
      select: { id: true, slug: true, name: true },
    });
  } catch {
    return [];
  }
}

export default async function Footer() {
  const categories = await getFooterCategories();

  // JSON-LD doanh nghiệp địa phương: giúp Google hiển thị thông tin công ty
  // và xếp hạng tốt hơn cho tìm kiếm theo khu vực ("máy đóng gói Bình Tân / TP.HCM").
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": abs("/#organization"),
    name: SITE.name,
    legalName: SITE.legalName,
    alternateName: SITE.legalName,
    url: abs("/"),
    logo: abs("/images/logo.png"),
    image: abs("/images/og-default.jpg"),
    description: SITE.tagline,
    foundingDate: "2013-04-10",
    taxID: SITE.taxCode,
    telephone: "+84834551888",
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "33 đường số 5, KDC Vĩnh Lộc, P. Bình Hưng Hòa B",
      addressLocality: "Bình Tân",
      addressRegion: "TP. Hồ Chí Minh",
      addressCountry: "VN",
    },
    // Toạ độ lấy từ bản đồ Google trên trang /lien-he
    geo: { "@type": "GeoCoordinates", latitude: 10.80752, longitude: 106.59104 },
    areaServed: { "@type": "Country", name: "Việt Nam" },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "16:30",
      },
    ],
    sameAs: [SITE.facebookUrl, SITE.youtubeUrl, SITE.tiktokUrl, SITE.zaloUrl],
  };

  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />

      <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-16 md:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:flex lg:justify-between lg:gap-10">
          {/* THƯƠNG HIỆU */}
          {/* Hàng logo cao đúng 34px = tiêu đề cột (18px) + khoảng cách (16px)
              → dòng giới thiệu thẳng hàng với dòng đầu tiên của các cột bên phải */}
          <div className="max-w-[320px]">
            <Link href="/" className="-mt-2 flex h-[34px] items-center gap-2.5">
              <img src="/images/logo.png" alt="" className="h-9 w-auto" />
              <span className="font-display text-[21px] font-bold leading-none tracking-[-0.03em]">McBrother</span>
            </Link>
            <p className="mt-2 max-w-[320px] text-[15px] leading-normal text-[var(--color-muted)]">{SITE.tagline}</p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink)] transition hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
              <a
                href={SITE.zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zalo"
                title="Zalo"
                className="flex h-10 items-center justify-center rounded-full border border-[var(--color-line)] px-3.5 text-[13px] font-bold text-[var(--color-ink)] transition hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white"
              >
                Zalo
              </a>
            </div>
          </div>

          {/* DANH MỤC */}
          <div>
            <h4 className="mb-4 font-sans text-[12px] font-semibold leading-[18px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Sản phẩm
            </h4>
            <ul className="space-y-2.5 text-[15px]">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/${c.slug}`} className="hover:text-[var(--color-primary)]">
                      {niceName(c.name)}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <Link href="/san-pham" className="hover:text-[var(--color-primary)]">
                    Tất cả sản phẩm
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* CÔNG TY */}
          <div>
            <h4 className="mb-4 font-sans text-[12px] font-semibold leading-[18px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Công ty
            </h4>
            <ul className="space-y-2.5 text-[15px]">
              <li><Link href="/gioi-thieu" className="hover:text-[var(--color-primary)]">Về chúng tôi</Link></li>
              <li><Link href="/tin-tuc" className="hover:text-[var(--color-primary)]">Kiến thức</Link></li>
              <li><Link href="/chinh-sach-bao-hanh-giao-hang" className="hover:text-[var(--color-primary)]">Bảo hành & giao hàng</Link></li>
              <li><Link href="/lien-he" className="hover:text-[var(--color-primary)]">Liên hệ</Link></li>
            </ul>
          </div>

          {/* LIÊN HỆ */}
          <div className="max-w-[300px] space-y-2.5 text-[15px]">
            <h4 className="mb-4 font-sans text-[12px] font-semibold leading-[18px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Liên hệ
            </h4>
            <p className="leading-normal text-[var(--color-muted)]">{SITE.address}</p>
            <p>
              <a href={`tel:${SITE.phone}`} className="font-display text-[22px] font-semibold tracking-[-0.02em] hover:text-[var(--color-primary)]">
                {SITE.phoneDisplay}
              </a>
            </p>
            <p>
              <a href={`mailto:${SITE.email}`} className="hover:text-[var(--color-primary)]">
                {SITE.email}
              </a>
            </p>
          </div>
        </div>

        {/* CHỮ THƯƠNG HIỆU LỚN: tự co giãn cho vừa đúng chiều ngang khung */}
        <div aria-hidden className="mt-16 overflow-hidden [container-type:inline-size]">
          <div className="select-none whitespace-nowrap font-display font-bold leading-[0.8] tracking-[-0.05em] text-[var(--color-sand)] [font-size:22.5cqw]">
            McBrother
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-line)] pt-6 text-[13px] text-[var(--color-muted)] md:flex-row md:justify-between">
          <span>
            {SITE.legalName} · GPKD {SITE.taxCode} cấp ngày {SITE.taxCodeIssuedAt}
          </span>
          <span>© {new Date().getFullYear()} {SITE.name}</span>
        </div>
      </div>
    </footer>
  );
}