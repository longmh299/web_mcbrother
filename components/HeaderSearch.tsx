"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Suggest = { name: string; slug: string };

/**
 * Nút kính lúp trên header → mở thanh tìm kiếm ngay dưới header.
 * - Gõ ≥ 2 ký tự: gợi ý sản phẩm (tên / mã SKU) từ /api/product-suggest
 * - Enter: sang /tim-kiem?q=… (tìm cả sản phẩm và bài viết)
 * - Esc hoặc bấm ra ngoài: đóng
 */
export default function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggest[]>([]);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Đóng khi chuyển trang
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Focus ô nhập khi mở; Esc để đóng; bấm ra ngoài để đóng
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Gợi ý sản phẩm (debounce)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/product-suggest?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: Suggest[] };
        setItems(json.items ?? []);
        setActive(-1);
      } catch {
        /* bỏ qua lỗi mạng / abort */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) {
      router.push(`/san-pham/${items[active].slug}`);
      return;
    }
    const term = q.trim();
    if (!term) return;
    router.push(`/tim-kiem?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    }
  }

  return (
    <div ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Đóng tìm kiếm" : "Tìm kiếm sản phẩm"}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink)] transition hover:border-[var(--color-ink)]"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-y border-[var(--color-line)] bg-[var(--color-bg)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]">
          <div className="mx-auto max-w-[860px] px-4 py-5 md:px-8 md:py-7">
            <form onSubmit={submit} role="search" className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1.5 pl-5 focus-within:border-[var(--color-ink)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[var(--color-muted)]" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tìm máy theo tên hoặc mã máy, VD: máy dán nhãn, DZ-400…"
                aria-label="Từ khoá tìm kiếm"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-[var(--color-muted)]"
              />
              <button type="submit" className="btn-pill-dark min-h-[44px] shrink-0 px-5 font-medium">
                Tìm
              </button>
            </form>

            {items.length > 0 && (
              <ul className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white">
                {items.map((it, i) => (
                  <li key={it.slug}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => router.push(`/san-pham/${it.slug}`)}
                      className={`block w-full px-5 py-3 text-left text-[15px] transition ${i === active ? "bg-[var(--color-sand)] text-[var(--color-primary)]" : "text-[var(--color-ink)]"}`}
                    >
                      {it.name}
                    </button>
                  </li>
                ))}
                <li className="border-t border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => router.push(`/tim-kiem?q=${encodeURIComponent(q.trim())}`)}
                    className="block w-full px-5 py-3 text-left text-[14px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    Xem tất cả kết quả cho “{q.trim()}” →
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
