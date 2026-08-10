import { Settings, ShieldCheck, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import WatermarkImage from "./WatermarkImage";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  coverImage: string | null;
  short: string | null;
  category?: { id: number; name: string } | null;
};

function fmtVND(n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return new Intl.NumberFormat("vi-VN").format(n);
}

function cldThumb(url: string | null, w = 600, h = 600) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (
      u.hostname.includes("res.cloudinary.com") &&
      u.pathname.includes("/upload/")
    ) {
      return url.replace(
        "/upload/",
        `/upload/c_fit,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`
      );
    }
  } catch { }
  return url;
}

export default function ProductCard({ p }: { p: ProductCardData }) {
  const hasPrice = typeof p.price === "number" && Number.isFinite(p.price);
  const imgUrl = cldThumb(p.coverImage, 600, 600);

  const features = p.short
    ? p.short
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2)
    : [];

  return (
    <article className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-[4px] hover:border-[var(--color-primary)]">

      {/* IMAGE */}
      <Link href={`/san-pham/${p.slug}`} className="relative block">
        <div className="relative h-[200px] bg-white flex items-center justify-center overflow-hidden">

          {imgUrl ? (
            <WatermarkImage
              src={imgUrl}
              alt={p.name}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
              watermarkSize={28}
              position="bottom-right"
              opacity={0.6}
            />
          ) : (
            <div className="text-sm text-gray-400">No image</div>
          )}
        </div>
      </Link>

      {/* CONTENT - thêm flex-1 để chiếm hết chiều cao còn lại của card */}
      <div className="flex flex-col flex-1 p-4">

        {/* CATEGORY */}
        {p.category && (
          <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
            {p.category.name}
          </div>
        )}

        {/* TITLE - thêm min-h-[40px] để khoá cứng chiều cao dù 1 hay 2 dòng */}
        <Link href={`/san-pham/${p.slug}`}>
          <h2 className="text-[15px] font-semibold leading-snug text-gray-800 line-clamp-2 min-h-[40px] uppercase hover:text-[var(--color-primary)] transition">
            {p.name}
          </h2>
        </Link>

        <div className="mt-2 min-h-[40px]">
          {features.length > 0 ? (
            <ul className="text-[13px] text-gray-600 space-y-1">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">

                  <Wrench className="w-4 h-4 shrink-0 mt-[2px] text-[var(--color-accent)]" />

                  <span className="line-clamp-1 leading-snug">
                    {f}
                  </span>

                </li>
              ))}
            </ul>
          ) : p.short ? (
            <p className="text-[13px] text-gray-600 line-clamp-2">
              {p.short}
            </p>
          ) : null}
        </div>

        {/* PRICE */}
        <div className="mt-2 text-[15px] font-semibold text-[var(--color-primary-dark)]">
          {hasPrice ? `${fmtVND(p.price)} ₫` : "Giá: Liên hệ"}
        </div>

        {/* TRUST */}

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
          Hàng nhập khẩu
        </div>

        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[var(--color-accent)]" />
          Giao hàng toàn quốc
        </div>

        {/* CTA - thêm mt-auto để luôn dính đáy card */}
        <div className="pt-3 flex gap-2 mt-auto">

          {/* XEM CHI TIẾT */}
          <Link
            href={`/san-pham/${p.slug}`}
            className="flex-1 text-center py-2 rounded border border-gray-200 text-[13px] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
          >
            Xem chi tiết
          </Link>

          {/* BÁO GIÁ */}
          <a
            href="https://zalo.me/0834551888"
            target="_blank"
            className="flex-1 text-center py-2 rounded bg-[var(--color-primary)] text-white text-[13px] font-semibold hover:bg-[var(--color-primary-dark)] transition"
          >
            Báo giá
          </a>

        </div>
      </div>
    </article>
  );
}