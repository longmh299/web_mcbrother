// components/admin/ListToolbar.tsx
// Ô tìm kiếm + bộ lọc dạng chọn: đổi lựa chọn là lọc ngay, gõ tìm kiếm tự lọc sau 0.4s.
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { inputCls } from "./ui";

export type FilterSelect = {
  name: string;
  placeholder: string;
  options: { value: string; label: string }[];
};

export default function ListToolbar({
  searchPlaceholder = "Tìm kiếm…",
  selects = [],
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete("page"); // đổi bộ lọc → về trang 1
    start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`));
  };

  // gõ xong 0.4s mới tìm
  useEffect(() => {
    if (q.trim() === (sp.get("q") ?? "")) return; // không đổi → không tải lại
    const t = setTimeout(() => push({ q: q.trim() }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilter = !!(sp.get("q") || selects.some((s) => sp.get(s.name)));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 sm:w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className={`${inputCls} pl-9`} />
      </div>
      {selects.map((s) => (
        <select
          key={s.name}
          value={sp.get(s.name) ?? ""}
          onChange={(e) => push({ [s.name]: e.target.value })}
          className={`${inputCls} sm:w-auto`}
        >
          <option value="">{s.placeholder}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            start(() => router.replace(pathname));
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <X size={14} /> Xoá lọc
        </button>
      )}
      {pending && <Loader2 size={16} className="animate-spin text-slate-400" />}
    </div>
  );
}
