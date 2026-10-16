// components/admin/ProductTable.tsx
// Bảng sản phẩm: chọn nhiều để thao tác hàng loạt, bật/tắt nhanh Hiển thị & Nổi bật.
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, ImageOff, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { bulkProductOp, deleteProduct, toggleProductFlag } from "@/app/admin/products/actions";
import { btnCls } from "./ui";

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: number | null;
  coverImage: string | null;
  published: boolean;
  isFeatured: boolean;
  updatedAt: string; // ISO
  category: string | null;
};

function thumb(url: string | null) {
  if (!url) return null;
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,f_auto,q_auto,w_96,h_96/")
    : url;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtPrice = (n: number | null) => (n ? `${n.toLocaleString("vi-VN")} đ` : "Liên hệ");

function fd(obj: Record<string, string | string[]>) {
  const f = new FormData();
  Object.entries(obj).forEach(([k, v]) => (Array.isArray(v) ? v.forEach((x) => f.append(k, x)) : f.append(k, v)));
  return f;
}

/* ---------- Công tắc nhỏ trong bảng ---------- */
function MiniSwitch({ on, busy, onClick, title }: { on: boolean; busy?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-emerald-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export default function ProductTable({ rows }: { rows: ProductRow[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const allOn = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allOn ? [] : rows.map((r) => r.id));
  const toggleOne = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const flag = (r: ProductRow, field: "published" | "isFeatured") => {
    const key = `${r.id}-${field}`;
    setBusyId(key);
    start(async () => {
      await toggleProductFlag(fd({ id: String(r.id), field, value: String(!r[field]) }));
      setBusyId(null);
    });
  };

  const bulk = (op: string) => {
    if (!selected.length) return;
    if (op === "delete" && !confirm(`Xoá vĩnh viễn ${selected.length} sản phẩm đã chọn?`)) return;
    start(async () => {
      await bulkProductOp(fd({ op, ids: selected.map(String) }));
      setSelected([]);
    });
  };

  const del = (r: ProductRow) => {
    if (!confirm(`Xoá sản phẩm “${r.name}”?\nThao tác này không hoàn tác được.`)) return;
    setBusyId(`${r.id}-del`);
    start(async () => {
      await deleteProduct(fd({ id: String(r.id) }));
      setBusyId(null);
    });
  };

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Không có sản phẩm nào khớp bộ lọc.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ===== Thanh thao tác hàng loạt ===== */}
      {selected.length > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg md:top-2">
          <span className="font-medium">Đã chọn {selected.length}</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          {[
            ["publish", "Hiển thị"],
            ["unpublish", "Ẩn"],
            ["feature", "Đặt nổi bật"],
            ["unfeature", "Bỏ nổi bật"],
          ].map(([op, label]) => (
            <button key={op} type="button" onClick={() => bulk(op)} disabled={pending} className="rounded-md px-2.5 py-1 hover:bg-white/10">
              {label}
            </button>
          ))}
          <button type="button" onClick={() => bulk("delete")} disabled={pending} className="rounded-md px-2.5 py-1 text-red-300 hover:bg-red-500/20">
            Xoá
          </button>
          {pending && <Loader2 size={16} className="animate-spin" />}
          <button type="button" onClick={() => setSelected([])} className="ml-auto rounded-md px-2.5 py-1 text-white/70 hover:bg-white/10">
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ===== Bảng (máy tính) ===== */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Chọn tất cả" className="h-4 w-4 rounded" />
              </th>
              <th className="px-2 py-3">Sản phẩm</th>
              <th className="hidden px-3 py-3 lg:table-cell">Danh mục</th>
              <th className="hidden px-3 py-3 text-right xl:table-cell">Giá</th>
              <th className="px-3 py-3 text-center">Hiển thị</th>
              <th className="px-3 py-3 text-center">Nổi bật</th>
              <th className="hidden px-3 py-3 xl:table-cell">Cập nhật</th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const t = thumb(r.coverImage);
              const sel = selected.includes(r.id);
              return (
                <tr key={r.id} className={`group ${sel ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={sel} onChange={() => toggleOne(r.id)} aria-label={`Chọn ${r.name}`} className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Link href={`/admin/products/${r.id}/edit`} className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {t ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <ImageOff size={18} className="text-slate-300" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-medium text-slate-900 group-hover:text-blue-700">{r.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {r.sku ? `${r.sku} · ` : ""}/{r.slug}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2.5 text-slate-600 lg:table-cell">{r.category ?? <span className="text-slate-400">—</span>}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-700 xl:table-cell">{fmtPrice(r.price)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <MiniSwitch
                      on={r.published}
                      busy={busyId === `${r.id}-published`}
                      onClick={() => flag(r, "published")}
                      title={r.published ? "Đang hiển thị – bấm để ẩn" : "Đang ẩn – bấm để hiển thị"}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => flag(r, "isFeatured")}
                      disabled={busyId === `${r.id}-isFeatured`}
                      title={r.isFeatured ? "Bỏ nổi bật" : "Đặt nổi bật"}
                      className="rounded p-1 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <Star size={18} className={r.isFeatured ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                    </button>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-slate-500 xl:table-cell">{fmtDate(r.updatedAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link href={`/admin/products/${r.id}/edit`} className={btnCls.icon} title="Sửa">
                        <Pencil size={16} />
                      </Link>
                      {r.published && (
                        <a href={`/san-pham/${r.slug}`} target="_blank" rel="noreferrer" className={btnCls.icon} title="Xem trên web">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button type="button" onClick={() => del(r)} className={btnCls.danger} title="Xoá" disabled={busyId === `${r.id}-del`}>
                        {busyId === `${r.id}-del` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== Danh sách thẻ (điện thoại) ===== */}
      <div className="space-y-2 md:hidden">
        {rows.map((r) => {
          const t = thumb(r.coverImage);
          return (
            <div key={r.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={() => toggleOne(r.id)}
                className="mt-1 h-4 w-4 shrink-0 rounded"
                aria-label={`Chọn ${r.name}`}
              />
              <Link href={`/admin/products/${r.id}/edit`} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageOff size={18} className="text-slate-300" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/products/${r.id}/edit`} className="line-clamp-2 text-sm font-medium text-slate-900">
                  {r.name}
                </Link>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {r.category ?? "Chưa có danh mục"} · {fmtPrice(r.price)}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MiniSwitch on={r.published} busy={busyId === `${r.id}-published`} onClick={() => flag(r, "published")} title="Hiển thị" />
                    {r.published ? "Hiển thị" : "Ẩn"}
                  </span>
                  <button type="button" onClick={() => flag(r, "isFeatured")} className="p-0.5" title="Nổi bật">
                    <Star size={18} className={r.isFeatured ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                  </button>
                  <button type="button" onClick={() => del(r)} className={`${btnCls.danger} ml-auto`} title="Xoá">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
