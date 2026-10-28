"use client";

// Nút "Danh mục sản phẩm" dính dưới header.
// Bấm vào mở bảng danh mục rộng toàn trang, chia cột; bấm ra ngoài / nhấn Esc / chọn danh mục để đóng.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Category = { id: number; name: string; slug: string };

export default function CategoryMegaMenu({
  categories,
  label = "Danh mục sản phẩm",
  mode = "anchor",
}: {
  categories: Category[];
  label?: string;
  /** "anchor": cuộn tới nhóm trên cùng trang (/san-pham) · "link": chuyển sang trang danh mục */
  mode?: "anchor" | "link";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Danh mục đang xem (ở trang /<slug-danh-muc>)
  const current = categories.find((c) => pathname === `/${c.slug}`);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Đóng khi chuyển trang
  useEffect(() => setOpen(false), [pathname]);

  const itemCls = (active: boolean) =>
    `group flex items-center justify-between gap-4 border-b border-[var(--color-line)] py-4 font-display text-[19px] font-semibold tracking-[-0.015em] transition ${
      active ? "text-[var(--color-primary)]" : "text-[var(--color-ink)] hover:text-[var(--color-primary)]"
    }`;

  const arrow = (
    <span aria-hidden className="text-[18px] text-[var(--color-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)]">
      →
    </span>
  );

  return (
    <div ref={wrapRef} className="sticky top-20 z-30 border-y border-[var(--color-line)] bg-[rgba(246,244,239,0.95)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 md:px-8">
        {/* NÚT MỞ BẢNG */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="category-panel"
          className="btn-pill-dark min-h-[44px] gap-2.5 px-5 font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {label}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* BÊN PHẢI: đang xem danh mục nào / tổng số danh mục */}
        <span className="hidden truncate text-[14px] text-[var(--color-muted)] sm:block">
          {current ? (
            <>
              Đang xem: <strong className="font-semibold text-[var(--color-ink)]">{current.name}</strong>
            </>
          ) : (
            `${categories.length} dòng máy`
          )}
        </span>
      </div>

      {/* BẢNG DANH MỤC */}
      {open && (
        <div
          id="category-panel"
          className="absolute inset-x-0 top-full border-b border-[var(--color-line)] bg-[var(--color-bg)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]"
        >
          <div className="mx-auto max-h-[70vh] max-w-[1320px] overflow-y-auto px-4 pb-8 pt-4 md:px-8">
            <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {mode === "link" && (
                <Link href="/san-pham" className={itemCls(pathname === "/san-pham")}>
                  Tất cả sản phẩm {arrow}
                </Link>
              )}
              {categories.map((cat) =>
                mode === "anchor" ? (
                  <a key={cat.id} href={`#cat-${cat.slug}`} onClick={() => setOpen(false)} className={itemCls(false)}>
                    {cat.name} {arrow}
                  </a>
                ) : (
                  <Link key={cat.id} href={`/${cat.slug}`} className={itemCls(current?.id === cat.id)}>
                    {cat.name} {arrow}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}