"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type Cat = {
  id: number;
  name: string;
  slug: string;
  ogImage?: string | null;
  children?: Cat[];
};

const nav = [
  { href: "/san-pham", label: "Sản phẩm" },
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/tin-tuc", label: "Kiến thức" },
  { href: "/lien-he", label: "Liên hệ" },
];

export default function Header({ categories = [] }: { categories: Cat[] }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [open, setOpen] = useState(false); // menu mobile

  useEffect(() => {
    if (categories.length > 0) setActiveTab(categories[0].id);
  }, [categories]);

  // Đóng menu mobile khi chuyển trang
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const activeCategory = categories.find((c) => c.id === activeTab);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const linkCls = (href: string) =>
    `py-2 text-[15px] transition border-b-[1.5px] ${isActive(href)
      ? "border-[var(--color-primary)] font-semibold text-[var(--color-ink)]"
      : "border-transparent text-[var(--color-ink)] hover:border-[var(--color-ink)]"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(214,209,198,0.7)] bg-[rgba(246,244,239,0.92)] backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-6 px-4 md:px-8">
        {/* LOGO: biểu tượng + chữ */}
        <Link
          href="/"
          aria-label={`${SITE.name} – Trang chủ`}
          className="flex shrink-0 items-center gap-3"
        >
          <Image
            src="/images/logo.png"
            alt=""
            width={160}
            height={122}
            priority
            className="h-12 w-auto"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[21px] font-bold tracking-[-0.03em] text-[var(--color-ink)]">
              McBrother
            </span>
            <span className="mt-1 hidden text-[11px] text-[var(--color-muted)] sm:block">
              Máy chế biến & đóng gói
            </span>
          </span>
        </Link>

        {/* NAV DESKTOP */}
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-9 md:flex">
          {nav.map((item) => {
            if (item.href !== "/san-pham") {
              return (
                <div key={item.href} className="flex h-20 items-center">
                  <Link href={item.href} className={linkCls(item.href)}>
                    {item.label}
                  </Link>
                </div>
              );
            }

            // "Sản phẩm" + mega menu danh mục
            return (
              <div key={item.href} className="group flex h-20 items-center">
                <Link href="/san-pham" className={linkCls(item.href)}>
                  {item.label}
                </Link>

                {categories.length > 0 && (
                  <div className="invisible absolute inset-x-0 top-full z-50 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="border-y border-[var(--color-line)] bg-[var(--color-bg)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]">
                      <div className="mx-auto flex h-[min(520px,70vh)] max-w-[1320px]">
                        {/* Cột trái: danh mục cấp 1 */}
                        <div className="w-[280px] shrink-0 overflow-y-auto border-r border-[var(--color-line)] py-4">
                          {categories.map((c) => (
                            <Link
                              key={c.id}
                              href={`/${c.slug}`}
                              onMouseEnter={() => setActiveTab(c.id)}
                              className={`block px-8 py-3 text-[15px] transition ${activeTab === c.id
                                ? "font-semibold text-[var(--color-primary)]"
                                : "text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                                }`}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>

                        {/* Cột phải: danh mục con + ảnh */}
                        <div className="flex-1 overflow-y-auto px-10 py-8">
                          {activeCategory?.children?.length ? (
                            activeCategory.children.map((sub) => (
                              <div key={sub.id} className="mb-10">
                                <Link
                                  href={`/${sub.slug}`}
                                  className="font-display text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                                >
                                  {sub.name}
                                </Link>

                                {!!sub.children?.length && (
                                  <div className="mt-5 grid grid-cols-4 gap-5 xl:grid-cols-6">
                                    {sub.children.map((child) => (
                                      <Link key={child.id} href={`/${child.slug}`} className="group/item block">
                                        <div className="relative [aspect-ratio:1/1] overflow-hidden rounded-2xl bg-[var(--color-sand)]">
                                          <Image
                                            src={child.ogImage || "/images/no-image.jpg"}
                                            alt={child.name}
                                            fill
                                            sizes="160px"
                                            className="object-cover transition duration-500 group-hover/item:scale-105"
                                          />
                                        </div>
                                        <div className="mt-2.5 line-clamp-2 text-[14px] text-[var(--color-ink)] group-hover/item:text-[var(--color-primary)]">
                                          {child.name}
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <Link
                              href={activeCategory ? `/${activeCategory.slug}` : "/san-pham"}
                              className="link-underline"
                            >
                              Xem tất cả {activeCategory?.name?.toLowerCase() || "sản phẩm"}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* PHẢI: hotline + báo giá */}
        <div className="hidden items-center gap-5 md:flex">
          <a
            href={`tel:${SITE.phone}`}
            className="text-[15px] font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
          >
            {SITE.phoneDisplay}
          </a>
          <Link href="/lien-he" className="btn-pill-dark min-h-[44px] px-5 font-medium">
            Báo giá
          </Link>
        </div>

        {/* NÚT MENU MOBILE */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* MENU MOBILE */}
      {open && (
        <div className="max-h-[calc(100vh-80px)] overflow-y-auto border-t border-[var(--color-line)] bg-[var(--color-bg)] md:hidden">
          <nav aria-label="Menu mobile" className="flex flex-col px-4 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-[var(--color-line)] py-4 font-display text-[22px] font-semibold tracking-[-0.02em]"
              >
                {item.label}
              </Link>
            ))}

            {categories.length > 0 && (
              <div className="py-4">
                <div className="eyebrow mb-3">Danh mục</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/${c.slug}`}
                      className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[14px]"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-3">
              <a href={`tel:${SITE.phone}`} className="btn-pill-outline">
                Gọi {SITE.phoneDisplay}
              </a>
              <Link href="/lien-he" className="btn-pill-primary">
                Báo giá
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}