// components/admin/PostTable.tsx
// Bảng bài viết: chọn nhiều để đăng/ẩn/xoá, bật/tắt hiển thị ngay trên dòng.
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, ImageOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { bulkPostOp, deletePost, togglePostPublished } from "@/app/admin/news/actions";
import { btnCls } from "./ui";

export type PostRow = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  category: string | null;
};

function thumb(url: string | null) {
  if (!url) return null;
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,f_auto,q_auto,w_160,h_100/")
    : url;
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

function fd(obj: Record<string, string | string[]>) {
  const f = new FormData();
  Object.entries(obj).forEach(([k, v]) => (Array.isArray(v) ? v.forEach((x) => f.append(k, x)) : f.append(k, v)));
  return f;
}

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

export default function PostTable({ rows }: { rows: PostRow[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const allOn = rows.length > 0 && selected.length === rows.length;
  const toggleOne = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggle = (r: PostRow) => {
    setBusy(`${r.id}-pub`);
    start(async () => {
      await togglePostPublished(fd({ id: String(r.id), value: r.published ? "0" : "1" }));
      setBusy(null);
    });
  };
  const bulk = (op: string) => {
    if (op === "delete" && !confirm(`Xoá vĩnh viễn ${selected.length} bài viết đã chọn?`)) return;
    start(async () => {
      await bulkPostOp(fd({ op, ids: selected.map(String) }));
      setSelected([]);
    });
  };
  const del = (r: PostRow) => {
    if (!confirm(`Xoá bài “${r.title}”?\nThao tác này không hoàn tác được.`)) return;
    setBusy(`${r.id}-del`);
    start(async () => {
      await deletePost(fd({ id: String(r.id) }));
      setBusy(null);
    });
  };

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Không có bài viết nào khớp bộ lọc.
      </div>
    );
  }

  const Thumb = ({ r, cls }: { r: PostRow; cls: string }) => {
    const t = thumb(r.coverImage);
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 ${cls}`}>
        {t ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff size={16} className="text-slate-300" />
        )}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg md:top-2">
          <span className="font-medium">Đã chọn {selected.length}</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button type="button" onClick={() => bulk("publish")} disabled={pending} className="rounded-md px-2.5 py-1 hover:bg-white/10">
            Đăng
          </button>
          <button type="button" onClick={() => bulk("unpublish")} disabled={pending} className="rounded-md px-2.5 py-1 hover:bg-white/10">
            Chuyển nháp
          </button>
          <button type="button" onClick={() => bulk("delete")} disabled={pending} className="rounded-md px-2.5 py-1 text-red-300 hover:bg-red-500/20">
            Xoá
          </button>
          {pending && <Loader2 size={16} className="animate-spin" />}
          <button type="button" onClick={() => setSelected([])} className="ml-auto rounded-md px-2.5 py-1 text-white/70 hover:bg-white/10">
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Máy tính */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? [] : rows.map((r) => r.id))}
                  aria-label="Chọn tất cả"
                  className="h-4 w-4 rounded"
                />
              </th>
              <th className="px-2 py-3">Bài viết</th>
              <th className="hidden px-3 py-3 lg:table-cell">Chuyên mục</th>
              <th className="px-3 py-3 text-center">Hiển thị</th>
              <th className="hidden px-3 py-3 xl:table-cell">Ngày đăng</th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const sel = selected.includes(r.id);
              return (
                <tr key={r.id} className={`group ${sel ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={sel} onChange={() => toggleOne(r.id)} aria-label={`Chọn ${r.title}`} className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-2 py-2.5">
                    <Link href={`/admin/news/${r.id}/edit`} className="flex min-w-0 items-center gap-3">
                      <Thumb r={r} cls="h-12 w-20" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-medium text-slate-900 group-hover:text-blue-700">{r.title}</span>
                        <span className="block truncate text-xs text-slate-500">/tin-tuc/{r.slug}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-3 py-2.5 text-slate-600 lg:table-cell">{r.category ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">
                    <MiniSwitch
                      on={r.published}
                      busy={busy === `${r.id}-pub`}
                      onClick={() => toggle(r)}
                      title={r.published ? "Đang hiển thị – bấm để chuyển nháp" : "Bản nháp – bấm để đăng"}
                    />
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-slate-500 xl:table-cell">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link href={`/admin/news/${r.id}/edit`} className={btnCls.icon} title="Sửa">
                        <Pencil size={16} />
                      </Link>
                      {r.published && (
                        <a href={`/tin-tuc/${r.slug}`} target="_blank" rel="noreferrer" className={btnCls.icon} title="Xem trên web">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button type="button" onClick={() => del(r)} className={btnCls.danger} title="Xoá" disabled={busy === `${r.id}-del`}>
                        {busy === `${r.id}-del` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Điện thoại */}
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} className="mt-1 h-4 w-4 shrink-0 rounded" />
            <Link href={`/admin/news/${r.id}/edit`}>
              <Thumb r={r} cls="h-14 w-20" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/news/${r.id}/edit`} className="line-clamp-2 text-sm font-medium text-slate-900">
                {r.title}
              </Link>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {r.category ?? "Chưa có chuyên mục"} · {fmtDate(r.createdAt)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <MiniSwitch on={r.published} busy={busy === `${r.id}-pub`} onClick={() => toggle(r)} title="Hiển thị" />
                {r.published ? "Đã đăng" : "Nháp"}
                <button type="button" onClick={() => del(r)} className={`${btnCls.danger} ml-auto`} title="Xoá">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
