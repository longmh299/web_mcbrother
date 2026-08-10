// components/Footer.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SITE, abs } from "@/lib/site";

const socials = [
  {
    key: "ytb",
    label: "YouTube",
    href: SITE.youtubeUrl,
    icon: (props: any) => (
      <svg viewBox="0 0 24 24" {...props} fill="currentColor">
        <path d="M23.5 6.2a4 4 0 0 0-2.8-2.8C18.9 3 12 3 12 3s-6.9 0-8.7.4A4 4 0 0 0 .5 6.2A41 41 0 0 0 0 12a41 41 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.8C5.1 21 12 21 12 21s6.9 0 8.7-.4a4 4 0 0 0 2.8-2.8A41 41 0 0 0 24 12a41 41 0 0 0-.5-5.8zM9.5 15.5v-7L16 12l-6.5 3.5z"/>
      </svg>
    ),
  },
  {
    key: "fb",
    label: "Facebook",
    href: SITE.facebookUrl,
    icon: (props: any) => (
      <svg viewBox="0 0 24 24" {...props} fill="currentColor">
        <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.7c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z"/>
      </svg>
    ),
  },
  {
    key: "zalo",
    label: "Zalo",
    href: SITE.zaloUrl,
    icon: (props: any) => (
      <img src="/images/zalo.svg" alt="" {...props} />
    ),
  },
  {
    key: "tt",
    label: "TikTok",
    href: SITE.tiktokUrl,
    icon: (props: any) => (
      <svg viewBox="0 0 24 24" {...props} fill="currentColor">
        <path d="M16 8.3a6 6 0 0 0 4 1.5V13a9 9 0 0 1-4-.9v4.3a5.5 5.5 0 1 1-5.5-5.5c.2 0 .4 0 .6.1v3a2.5 2.5 0 1 0 1.9 2.4V3h3v5.3z"/>
      </svg>
    ),
  },
];

async function getFooterCategories() {
  try {
    return await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 4,
      select: { id: true, slug: true, name: true },
    });
  } catch {
    return [];
  }
}

export default async function Footer() {
  const categories = await getFooterCategories();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.legalName,
    alternateName: SITE.name,
    url: abs("/"),
    logo: abs("/images/logo.png"),
    description: SITE.tagline,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address,
      addressCountry: "VN",
    },
    telephone: SITE.phone,
    email: SITE.email,
    sameAs: [SITE.facebookUrl, SITE.youtubeUrl, SITE.tiktokUrl, SITE.zaloUrl],
  };

  return (
    <footer className="bg-[#1f2d3d] text-white mt-0">
      {/* JSON-LD: giúp Google hiểu đây là 1 doanh nghiệp, hỗ trợ rich snippet */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-6">
        {/* BRAND */}
        <div className="space-y-3">
          <div>
            <h3 className="text-[15px] font-bold uppercase">
              {SITE.legalName}
            </h3>
            <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
              {SITE.tagline}
            </p>
          </div>

          {/* SOCIAL */}
          <div className="flex gap-3">
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded bg-white/10 hover:bg-[var(--color-primary)] transition">
                  <s.icon className="w-4 h-4 text-white" />
                </div>
              </a>
            ))}
          </div>

          {/* BỘ CÔNG THƯƠNG */}
          <img
            src="/images/bo-cong-thuong.png"
            alt="Đã thông báo Bộ Công Thương"
            className="h-12 mt-2"
          />
        </div>

        {/* DANH MỤC */}
        <div>
          <h4 className="font-semibold mb-3 text-[14px]">Danh mục</h4>
          <ul className="space-y-1.5 text-[13px] text-white/70">
            {categories.length > 0 ? (
              categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/${c.slug}`}
                    className="hover:text-[var(--color-primary)]"
                  >
                    {c.name}
                  </Link>
                </li>
              ))
            ) : (
              <li>
                <Link
                  href="/san-pham"
                  className="hover:text-[var(--color-primary)]"
                >
                  Tất cả sản phẩm
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* CHÍNH SÁCH */}
        <div>
          <h4 className="font-semibold mb-3 text-[14px]">Chính sách</h4>
          <ul className="space-y-1.5 text-[13px] text-white/70">
            <li>
              <Link href="/chinh-sach-bao-hanh-giao-hang" className="hover:text-[var(--color-primary)]">
                Bảo hành & giao hàng
              </Link>
            </li>
            <li>
              <Link href="/lien-he" className="hover:text-[var(--color-primary)]">
                Liên hệ
              </Link>
            </li>
          </ul>
        </div>

        {/* CONTACT */}
        <div className="text-[13px] text-white/70 space-y-1.5">
          <h4 className="font-semibold mb-3 text-[14px]">Liên hệ</h4>

          <p>{SITE.address}</p>

          <p>
            Hotline:{" "}
            <a
              href={`tel:${SITE.phone}`}
              className="text-white hover:text-[var(--color-primary)]"
            >
              {SITE.phoneDisplay}
            </a>
          </p>

          <p>
            Email:{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="hover:text-[var(--color-primary)]"
            >
              {SITE.email}
            </a>
          </p>

          <p className="text-xs text-white/50 mt-2">
            GPKD: {SITE.taxCode} – cấp ngày {SITE.taxCodeIssuedAt}
          </p>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="border-t border-white/10 text-center text-xs text-white/50 py-3">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}