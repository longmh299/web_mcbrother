// components/CallCTA.tsx
// - Máy tính: nút gọi hotline nổi ở góc trái (nút Zalo nổi góc phải nằm ở CTA.tsx)
// - Điện thoại: 2 nút tròn xếp dọc ở góc phải (Zalo ở trên, Gọi ở dưới).
"use client";

import { SITE } from "@/lib/site";

const PhoneIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export default function CallCTA() {
  return (
    <>
      {/* ===== MÁY TÍNH: nút gọi nổi góc trái ===== */}
      <a
        href={`tel:${SITE.phone}`}
        aria-label={`Gọi hotline ${SITE.phoneDisplay}`}
        className="fixed bottom-5 left-6 z-50 hidden h-[52px] items-center gap-2.5 rounded-full bg-[var(--color-primary)] pl-1.5 pr-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:bg-[var(--color-primary-dark)] md:flex"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <PhoneIcon />
        </span>
        <span className="text-[15px] font-semibold tracking-wide">{SITE.phoneDisplay}</span>
      </a>

      {/* ===== ĐIỆN THOẠI: 2 nút tròn xếp dọc ở góc phải (Gọi / Zalo) ===== */}
      <div
        className="fixed right-4 z-50 flex flex-col gap-3 md:hidden"
        style={{ bottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <a
          href={SITE.zaloUrl}
          target="_blank"
          rel="noopener"
          aria-label="Nhắn Zalo"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[var(--color-line)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/zalo-logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
        </a>
        <a
          href={`tel:${SITE.phone}`}
          aria-label={`Gọi hotline ${SITE.phoneDisplay}`}
          className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary)] opacity-30" />
          <span className="relative">
            <PhoneIcon size={22} />
          </span>
        </a>
      </div>
    </>
  );
}