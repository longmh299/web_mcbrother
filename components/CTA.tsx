// components/CTA.tsx — nút "Tư vấn qua Zalo" nổi ở góc màn hình
"use client";

import { useEffect, useState } from "react";

type Props = {
  zalo?: string;
  side?: "left" | "right";
  size?: number; // chiều cao nút
  gap?: number;
  /** giữ lại cho tương thích với layout cũ (không còn dùng) */
  defaultOpen?: boolean;
  liftWhenFooter?: boolean;
};

export default function CTA({
  zalo = "0834551888",
  side = "right",
  size = 52,
  gap = 12,
  liftWhenFooter = true,
}: Props) {
  const [lift, setLift] = useState(0);

  // Né footer: khi footer hiện ra thì đẩy nút lên một chút
  useEffect(() => {
    if (!liftWhenFooter) return;
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      (entries) => setLift(entries.some((e) => e.isIntersecting) ? gap + 8 : 0),
      { rootMargin: "0px 0px -120px 0px" }
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [liftWhenFooter, gap]);

  const sideCls = side === "left" ? "left-4 md:left-6" : "right-4 md:right-6";

  return (
    <a
      href={`https://zalo.me/${zalo}`}
      target="_blank"
      rel="noopener"
      aria-label="Tư vấn qua Zalo"
      className={`fixed z-50 ${sideCls} hidden items-center gap-2.5 md:flex rounded-full bg-[var(--color-ink)] px-5 text-[15px] font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-[bottom,transform] duration-200 hover:-translate-y-0.5`}
      style={{ height: size, bottom: `calc(${20 + lift}px + env(safe-area-inset-bottom))` }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3DDC84] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3DDC84]" />
      </span>
      <span className="hidden sm:inline">Tư vấn qua Zalo</span>
      <span className="sm:hidden">Zalo</span>
    </a>
  );
}