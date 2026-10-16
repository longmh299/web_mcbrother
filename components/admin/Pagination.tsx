// components/admin/Pagination.tsx
// Phân trang gọn: ‹ 1 … 4 5 6 … 20 ›  (giữ nguyên các bộ lọc trên URL)
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  basePath,
  params,
  page,
  pages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // các số trang cần hiện
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);

  const base = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm";
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Phân trang">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} text-slate-600 hover:bg-white hover:shadow-sm`} aria-label="Trang trước">
          <ChevronLeft size={18} />
        </Link>
      ) : (
        <span className={`${base} text-slate-300`}>
          <ChevronLeft size={18} />
        </span>
      )}
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${base} ${n === page ? "bg-blue-600 font-medium text-white" : "text-slate-700 hover:bg-white hover:shadow-sm"}`}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={`${base} text-slate-600 hover:bg-white hover:shadow-sm`} aria-label="Trang sau">
          <ChevronRight size={18} />
        </Link>
      ) : (
        <span className={`${base} text-slate-300`}>
          <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
