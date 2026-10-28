"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import WatermarkImage from "./WatermarkImage";
import { cld } from "@/lib/cloudinary";
import { formatPrice, hasPrice } from "@/lib/price";

export type Item = {
  id: number;
  slug: string;
  name: string;
  short?: string | null;
  coverImage?: string | null;
  price?: number | null;
};

function useSPV() {
  const [spv, setSpv] = useState(1);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280) setSpv(4);
      else if (w >= 1024) setSpv(3);
      else if (w >= 640) setSpv(2);
      else setSpv(1);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return spv;
}

type Props = {
  items: Item[];
  title?: string;
  viewAllHref?: string;
};

function ProductSlide({ p }: { p: Item }) {
  const firstLine = p.short?.split("\n").map((s) => s.trim()).filter(Boolean)[0];
  return (
    <article className="group flex h-full flex-col">
      {/* ẢNH */}
      <Link
        href={`/san-pham/${p.slug}`}
        className="block [aspect-ratio:1/1] overflow-hidden rounded-[24px] bg-white"
        draggable={false}
      >
        {p.coverImage ? (
          <WatermarkImage
            src={cld(p.coverImage, 560) ?? p.coverImage}
            alt={p.name}
            wrapperClassName="flex h-full w-full items-center justify-center p-6"
            className="max-h-full max-w-full object-contain transition duration-700 group-hover:scale-[1.04]"
            watermarkSize={30}
            position="bottom-right"
            opacity={0.5}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">Chưa có ảnh</div>
        )}
      </Link>

      {/* NỘI DUNG */}
      <div className="flex flex-1 flex-col pt-4">
        <Link
          href={`/san-pham/${p.slug}`}
          className="line-clamp-2 font-display text-[19px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--color-ink)] hover:text-[var(--color-primary)]"
          draggable={false}
        >
          {p.name}
        </Link>
        {firstLine && <p className="mt-1.5 line-clamp-1 text-[14px] text-[var(--color-muted)]">{firstLine}</p>}
        <div className="min-h-4 flex-1" />
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3.5">
          <span className={`text-[15px] font-semibold ${hasPrice(p.price) ? "text-[var(--color-ink)]" : "text-[var(--color-primary)]"}`}>
            {hasPrice(p.price) ? formatPrice(p.price) : "Liên hệ báo giá"}
          </span>
          <Link href={`/san-pham/${p.slug}`} className="text-[14px] font-medium hover:text-[var(--color-primary)]" draggable={false}>
            Chi tiết →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function FeaturedSlider({
  items,
  title = "Sản phẩm nổi bật",
  viewAllHref = "/san-pham",
}: Props) {
  const spv = useSPV();

  // maxIndex "thật" (không tính phần clone) - dùng cho nút prev/next & dot
  const maxIndex = Math.max(0, items.length - spv);
  // có đủ sản phẩm để loop không (phải nhiều hơn 1 trang hiển thị)
  const canLoop = items.length > spv;

  // nối thêm 1 nhóm slide đầu tiên vào cuối để tạo hiệu ứng loop liền mạch
  const trackItems = canLoop ? [...items, ...items.slice(0, spv)] : items;
  // vị trí index mà tại đó phần "clone" đang hiển thị y hệt vị trí index=0
  const loopResetIndex = items.length;

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [smooth, setSmooth] = useState(true); // false = nhảy tức thời, không animation

  const startX = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);

  const slideWidth = 100 / spv;

  // reset khi đổi số slide/trang hiển thị (resize) hoặc đổi danh sách sản phẩm
  useEffect(() => {
    setSmooth(false);
    setIndex(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSmooth(true));
    });
    return () => cancelAnimationFrame(id);
  }, [spv, items.length]);

  // ===== AUTO PLAY =====
  useEffect(() => {
    if (maxIndex <= 0 || isPaused) return; // không đủ item để chạy, hoặc đang hover/kéo thì dừng

    const timer = setInterval(() => {
      setIndex((i) => i + 1);
    }, 3500);

    return () => clearInterval(timer);
  }, [maxIndex, isPaused]);

  // khi chạy tới đúng vị trí "clone" (trông y hệt slide đầu) -> nhảy tức thời về index 0
  const handleTransitionEnd = () => {
    if (canLoop && index >= loopResetIndex) {
      setSmooth(false);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSmooth(true));
      });
    }
  };

  // ===== DRAG =====
  const onStart = (clientX: number) => {
    dragging.current = true;
    startX.current = clientX;
    setIsPaused(true);
  };

  const onMove = (clientX: number) => {
    if (!dragging.current) return;
    currentX.current = clientX;
  };

  const onEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsPaused(false);

    const delta = currentX.current - startX.current;

    if (delta > 60) {
      setIndex((i) => (i <= 0 ? (canLoop ? loopResetIndex - 1 : 0) : i - 1));
    } else if (delta < -60) {
      setIndex((i) => i + 1);
    }
  };

  const translate = `translate3d(${-index * slideWidth}%,0,0)`;

  // vị trí dot hiện tại (map phần clone về đúng dot gốc)
  const activeDot = index % (maxIndex + 1);

  return (
    <section className="space-y-10">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="display-lg text-[clamp(32px,4.2vw,56px)] text-[var(--color-ink)]">{title}</h2>

        <Link href={viewAllHref} className="link-underline">
          Xem tất cả sản phẩm
        </Link>
      </div>

      {/* SLIDER */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          onEnd();
        }}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseUp={onEnd}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
      >
        <ul
          className={`flex ${smooth ? "transition-transform duration-500 ease-out" : ""}`}
          style={{ transform: translate }}
          onTransitionEnd={handleTransitionEnd}
        >
          {trackItems.map((p, i) => (
            <li
              key={`${p.id}-${i}`}
              className="px-2.5 sm:px-3"
              style={{
                flex: `0 0 ${slideWidth}%`,
                maxWidth: `${slideWidth}%`,
              }}
            >
              <ProductSlide p={p} />
            </li>
          ))}
        </ul>

        {/* NAV */}
        {maxIndex > 0 && (
          <>
            <button
              type="button"
              aria-label="Sản phẩm trước"
              onClick={() =>
                setIndex((i) => (i <= 0 ? (canLoop ? loopResetIndex - 1 : 0) : i - 1))
              }
              className="absolute left-4 top-[34%] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-ink)] text-xl text-white shadow-lg transition hover:bg-black sm:flex"
            >
              ‹
            </button>

            <button
              type="button"
              aria-label="Sản phẩm tiếp theo"
              onClick={() => setIndex((i) => i + 1)}
              className="absolute right-4 top-[34%] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-ink)] text-xl text-white shadow-lg transition hover:bg-black sm:flex"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* DOT */}
      {maxIndex > 0 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Trang ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeDot ? "w-8 bg-[var(--color-ink)]" : "w-1.5 bg-[var(--color-line)]"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}