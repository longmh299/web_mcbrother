import Link from "next/link";
import WatermarkImage from "./WatermarkImage";
import { formatPrice, hasPrice } from "@/lib/price";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  coverImage: string | null;
  short: string | null;
  category?: { id: number; name: string } | null;
};

function cldThumb(url: string | null, w = 600, h = 600) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("res.cloudinary.com") && u.pathname.includes("/upload/")) {
      return url.replace("/upload/", `/upload/c_fit,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`);
    }
  } catch {}
  return url;
}

export default function ProductCard({ p }: { p: ProductCardData }) {
  const imgUrl = cldThumb(p.coverImage, 600, 600);

  // Dòng mô tả ngắn đầu tiên (VD: "Năng suất 200–800 kg/h")
  const firstLine = p.short
    ? p.short
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0]
    : null;

  return (
    <article className="group flex h-full flex-col">
      {/* ẢNH */}
      <Link
        href={`/san-pham/${p.slug}`}
        className="relative block [aspect-ratio:1/1] overflow-hidden rounded-[24px] bg-white"
        aria-label={p.name}
      >
        {imgUrl ? (
          <WatermarkImage
            src={imgUrl}
            alt={p.name}
            wrapperClassName="flex h-full w-full items-center justify-center p-6"
            className="max-h-full max-w-full object-contain transition duration-700 group-hover:scale-[1.04]"
            watermarkSize={28}
            position="bottom-right"
            opacity={0.5}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            Chưa có ảnh
          </div>
        )}
      </Link>

      {/* NỘI DUNG */}
      <div className="flex flex-1 flex-col pt-4">
        {p.category && (
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            {p.category.name}
          </div>
        )}

        <h2 className="font-display text-[19px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--color-ink)]">
          <Link href={`/san-pham/${p.slug}`} className="line-clamp-2 hover:text-[var(--color-primary)]">
            {p.name}
          </Link>
        </h2>

        {firstLine && (
          <p className="mt-1.5 line-clamp-1 text-[14px] text-[var(--color-muted)]">{firstLine}</p>
        )}

        <div className="flex-1 min-h-4" />
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3.5">
          <span className={`text-[15px] font-semibold ${hasPrice(p.price) ? "text-[var(--color-ink)]" : "text-[var(--color-primary)]"}`}>
            {hasPrice(p.price) ? formatPrice(p.price) : "Liên hệ báo giá"}
          </span>
          <Link
            href={`/san-pham/${p.slug}`}
            className="text-[14px] font-medium text-[var(--color-ink)] hover:text-[var(--color-primary)]"
          >
            Chi tiết →
          </Link>
        </div>
      </div>
    </article>
  );
}
