"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import WatermarkImage from "./WatermarkImage";
import { cld } from "@/lib/cloudinary";

export type Item = {
  id: number;
  slug: string;
  name: string;
  short?: string | null;
  coverImage?: string | null;
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
  return (
    <article className="h-full flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden transition duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[var(--color-primary)] group">
      {/* IMAGE */}
      <Link href={`/san-pham/${p.slug}`}>
        <div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden">
          {p.coverImage ? (
            <WatermarkImage
              src={cld(p.coverImage, 480) ?? p.coverImage}
              alt={p.name}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="w-full h-full object-contain p-3 transition duration-300 group-hover:scale-105"
              watermarkSize={36}
              position="bottom-right"
            />
          ) : (
            <div className="text-gray-400 text-sm">No Image</div>
          )}
        </div>
      </Link>

      {/* CONTENT */}
      <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
        <div className="text-[13px] text-[var(--color-primary-dark)] font-semibold">
          Liên hệ
        </div>

        <Link
          href={`/san-pham/${p.slug}`}
          className="text-[14px] sm:text-[15px] font-semibold text-slate-800 hover:text-[var(--color-primary)] line-clamp-2"
        >
          {p.name}
        </Link>

        {p.short && (
          <p className="text-sm text-gray-600 line-clamp-2">{p.short}</p>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button
            onClick={() => (window.location.href = "tel:0834551888")}
            className="flex-1 text-[12px] sm:text-[13px] border border-gray-300 py-2 rounded hover:border-[var(--color-primary)]"
          >
            Gọi ngay
          </button>

          <Link
            href={`/san-pham/${p.slug}`}
            className="flex-1 text-[12px] sm:text-[13px] bg-[var(--color-primary)] text-white py-2 rounded text-center"
          >
            Xem chi tiết
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
    <section className="max-w-7xl xl:max-w-[1280px] mx-auto px-4 py-12 space-y-6">
      {/* HEADER */}
      <div className="flex items-end justify-between">
        <h2 className="text-[22px] md:text-[26px] font-semibold text-slate-800">
          {title}
        </h2>

        <Link
          href={viewAllHref}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Xem tất cả →
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
              className="px-2 sm:px-3"
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
              onClick={() =>
                setIndex((i) => (i <= 0 ? (canLoop ? loopResetIndex - 1 : 0) : i - 1))
              }
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white border shadow"
            >
              ‹
            </button>

            <button
              onClick={() => setIndex((i) => i + 1)}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-white border shadow"
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
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === activeDot
                  ? "w-6 bg-[var(--color-primary)]"
                  : "w-2.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}