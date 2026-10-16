// components/admin/CategoryList.tsx
// Danh sách danh mục dạng cây (cha → con), dùng chung cho danh mục SP và chuyên mục tin.
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CornerDownRight, ExternalLink, ImageOff, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteCategory } from "@/app/admin/categories/actions";
import { deletePostCategory } from "@/app/admin/news-categories/actions";
import { Toast, btnCls, useToast } from "./ui";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  order: number;
  banner: string | null;
  isFeatured: boolean;
  count: number;
  noindex: boolean;
};

const CFG = {
  product: {
    edit: (id: number) => `/admin/categories/${id}`,
    add: (parent?: number) => `/admin/categories/new${parent ? `?parent=${parent}` : ""}`,
    publicUrl: (r: CategoryRow) => `/${r.slug}`,
    items: (r: CategoryRow) => `/admin/products?cat=${r.id}`,
    item: "sản phẩm",
    noun: "danh mục",
    del: deleteCategory,
  },
  post: {
    edit: (id: number) => `/admin/news-categories/${id}`,
    add: (parent?: number) => `/admin/news-categories/new${parent ? `?parent=${parent}` : ""}`,
    publicUrl: (r: CategoryRow) => `/tin-tuc?categoryId=${r.id}`,
    items: (r: CategoryRow) => `/admin/news?cat=${r.id}`,
    item: "bài viết",
    noun: "chuyên mục",
    del: deletePostCategory,
  },
};

function thumb(url: string | null) {
  if (!url) return null;
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/c_fill,f_auto,q_auto,w_120,h_80/")
    : url;
}

export default function CategoryList({ kind, rows }: { kind: "product" | "post"; rows: CategoryRow[] }) {
  const cfg = CFG[kind];
  const { toast, setToast } = useToast();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);

  // Sắp xếp dạng cây: cha trước, con ngay bên dưới
  const tree = useMemo(() => {
    const out: (CategoryRow & { depth: number })[] = [];
    const walk = (parent: number | null, depth: number) =>
      rows
        .filter((r) => r.parentId === parent)
        .forEach((r) => {
          out.push({ ...r, depth });
          walk(r.id, depth + 1);
        });
    walk(null, 0);
    rows.forEach((r) => !out.some((o) => o.id === r.id) && out.push({ ...r, depth: 0 }));
    return out;
  }, [rows]);

  const del = (r: CategoryRow) => {
    if (!confirm(`Xoá ${cfg.noun} “${r.name}”?`)) return;
    setBusy(r.id);
    start(async () => {
      const f = new FormData();
      f.append("id", String(r.id));
      const res = await cfg.del(f);
      setBusy(null);
      setToast(res.ok ? { type: "success", text: `Đã xoá “${r.name}”` } : { type: "error", text: res.error || "Xoá thất bại" });
    });
  };

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Chưa có {cfg.noun} nào.{" "}
        <Link href={cfg.add()} className="font-medium text-blue-600 hover:underline">
          Tạo {cfg.noun} đầu tiên
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {tree.map((r) => {
            const t = thumb(r.banner);
            return (
              <li key={r.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <div className="flex min-w-0 flex-1 items-center gap-3" style={{ paddingLeft: r.depth * 28 }}>
                  {r.depth > 0 && <CornerDownRight size={16} className="shrink-0 text-slate-300" />}
                  <span className="hidden h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 sm:flex">
                    {t ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff size={14} className="text-slate-300" />
                    )}
                  </span>
                  <Link href={cfg.edit(r.id)} className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`truncate ${r.depth === 0 ? "font-semibold" : "font-medium"} text-slate-900 group-hover:text-blue-700`}>
                        {r.name}
                      </span>
                      {r.isFeatured && <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" aria-label="Hiện ở trang chủ" />}
                      {r.noindex && <span className="rounded bg-amber-50 px-1.5 text-[11px] text-amber-700">noindex</span>}
                    </span>
                    <span className="block truncate text-xs text-slate-500">/{r.slug}</span>
                  </Link>
                </div>

                <Link
                  href={cfg.items(r)}
                  className="hidden whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 sm:inline"
                  title={`Xem ${cfg.item} trong ${cfg.noun} này`}
                >
                  {r.count} {cfg.item}
                </Link>
                <span className="hidden w-14 text-center text-xs text-slate-400 md:inline" title="Thứ tự">
                  #{r.order}
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Link href={cfg.add(r.id)} className={btnCls.icon} title={`Thêm ${cfg.noun} con`}>
                    <Plus size={16} />
                  </Link>
                  <Link href={cfg.edit(r.id)} className={btnCls.icon} title="Sửa">
                    <Pencil size={16} />
                  </Link>
                  <a href={cfg.publicUrl(r)} target="_blank" rel="noreferrer" className={`${btnCls.icon} hidden sm:inline-flex`} title="Xem trên web">
                    <ExternalLink size={16} />
                  </a>
                  <button type="button" onClick={() => del(r)} disabled={pending && busy === r.id} className={btnCls.danger} title="Xoá">
                    {pending && busy === r.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
