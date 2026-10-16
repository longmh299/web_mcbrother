"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Cat = {
  id: number;
  name: string;
  slug: string;
  ogImage?: string | null;
  children?: Cat[];
};

export default function Header({ categories = [] }: { categories: Cat[] }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [open, setOpen] = useState(false); // ✅ mobile menu

  useEffect(() => {
    if (categories.length > 0) {
      setActiveTab(categories[0].id);
    }
  }, [categories]);

  const activeCategory = categories.find((c) => c.id === activeTab);

  const nav = [
    { href: "/", label: "Trang chủ" },
    { href: "/gioi-thieu", label: "Giới thiệu" },
    { href: "/san-pham", label: "Sản phẩm" },
    { href: "/tin-tuc", label: "Tin tức" },
    { href: "/lien-he", label: "Liên hệ" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3">
          {/* 🔥 logo to hơn */}
          <Image src="/images/logo.png" alt="logo" width={80} height={80} />

          {/* 🔥 text brand */}
          <div className="leading-tight">
            <div className="font-bold text-[16px] text-slate-800">
              MCBROTHER JSC
            </div>
            <div className="text-[11px] text-gray-500">
              Giải pháp máy chế biến & đóng gói
            </div>
          </div>
        </Link>

        {/* NAV DESKTOP (GIỮ NGUYÊN 100%) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">

          {nav.map((item) => {
            const active = isActive(item.href);

            if (item.href === "/san-pham") {
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href="/san-pham"
                    className={`px-2 py-2 transition ${active
                        ? "text-[var(--color-primary)]"
                        : "text-slate-700 hover:text-[var(--color-primary)]"
                      }`}
                  >
                    {item.label}
                  </Link>

                  <div className="absolute top-full left-0 w-full h-3"></div>

                  {/* ❗ MEGA MENU GIỮ NGUYÊN */}
                  <div className="fixed left-0 top-[64px] w-screen z-50
                    opacity-0 invisible
                    group-hover:opacity-100 group-hover:visible
                    transition-all duration-200">

                    <div className="bg-white border-t shadow-lg w-full">
                      <div className="max-w-7xl mx-auto flex h-[520px]">

                        <div className="w-[260px] border-r bg-gray-50 overflow-y-auto">
                          {categories.map((c) => (
                            <div
                              key={c.id}
                              onMouseEnter={() => setActiveTab(c.id)}
                              className={`px-4 py-3 text-sm cursor-pointer flex items-center gap-2 transition
                                ${activeTab === c.id
                                  ? "bg-white font-medium text-[var(--color-primary)] border-l-2 border-[var(--color-primary)]"
                                  : "hover:bg-gray-100 text-gray-700"
                                }`}
                            >
                              {c.name}
                            </div>
                          ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                          {activeCategory?.children?.map((sub) => (
                            <div key={sub.id} className="mb-8">

                              <Link
                                href={`/${sub.slug}`}
                                className="font-semibold text-base mb-4 block text-slate-800 hover:text-[var(--color-primary)]"
                              >
                                {sub.name}
                              </Link>

                              <div className="grid grid-cols-6 gap-6">
                                {sub.children?.map((child) => (
                                  <Link
                                    key={child.id}
                                    href={`/${child.slug}`}
                                    className="text-center group"
                                  >
                                    {/* IMAGE */}
                                    <div
                                      className="relative w-36 h-36 mx-auto rounded-full overflow-hidden 
        border-2 border-[var(--color-primary)] bg-white
        shadow-sm transition-all duration-300 ease-out

        hover:border-[var(--color-accent)]
        hover:scale-105
        hover:shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
                                    >
                                      <Image
                                        src={child.ogImage || "/images/no-image.jpg"}
                                        alt={child.name}
                                        fill
                                        sizes="144px"
                                        className="object-cover"
                                      />
                                    </div>

                                    {/* TEXT */}
                                    <div
                                      className="text-sm mt-3 text-gray-700 line-clamp-2
        transition-colors duration-300
        hover:text-[var(--color-accent)]"
                                    >
                                      {child.name}
                                    </div>
                                  </Link>
                                ))}
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-2 transition ${active
                    ? "text-[var(--color-primary)]"
                    : "text-slate-700 hover:text-[var(--color-primary)]"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/lien-he"
            className="ml-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition"
          >
            Báo giá
          </Link>
        </nav>

        {/* ✅ MOBILE BUTTON */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>

      {/* ✅ MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white border-t shadow-md">
          <div className="flex flex-col p-4 gap-3 text-sm">

            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-2 border-b text-slate-700 hover:text-[var(--color-primary)]"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/lien-he"
              onClick={() => setOpen(false)}
              className="mt-2 text-center py-2 rounded bg-[var(--color-primary)] text-white font-semibold"
            >
              Báo giá
            </Link>

          </div>
        </div>
      )}

    </header>
  );
}