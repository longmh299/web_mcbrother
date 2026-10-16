// components/admin/CategoryForm.tsx
// Form Thêm / Sửa danh mục — dùng chung cho Danh mục sản phẩm và Chuyên mục tin tức.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { deleteCategory, saveCategory } from "@/app/admin/categories/actions";
import { deletePostCategory, savePostCategory } from "@/app/admin/news-categories/actions";
import { Card, CharCount, Field, ImagePicker, Switch, Toast, btnCls, inputCls, useToast } from "./ui";

export type CategoryKind = "product" | "post";

export type CategoryFormData = {
  id?: number;
  name: string;
  slug: string;
  parentId: number | null;
  order: number;
  isFeatured: boolean;
  banner: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  noindex: boolean;
  nofollow: boolean;
  itemCount?: number;
};

export type CategoryOpt = { id: number; name: string; parentId: number | null };

const CFG = {
  product: {
    list: "/admin/categories",
    edit: (id: number) => `/admin/categories/${id}`,
    publicUrl: (slug: string, _id?: number) => `/${slug}`,
    noun: "danh mục",
    item: "sản phẩm",
    save: saveCategory,
    del: deleteCategory,
    folder: "mcbrother/categories",
  },
  post: {
    list: "/admin/news-categories",
    edit: (id: number) => `/admin/news-categories/${id}`,
    publicUrl: (_slug: string, id?: number) => (id ? `/tin-tuc?categoryId=${id}` : "/tin-tuc"),
    noun: "chuyên mục",
    item: "bài viết",
    save: savePostCategory,
    del: deletePostCategory,
    folder: "mcbrother/posts",
  },
};

/** Danh sách chọn danh mục cha: bỏ chính nó và các danh mục con/cháu của nó */
function parentOptions(all: CategoryOpt[], selfId?: number) {
  const banned = new Set<number>();
  if (selfId) {
    banned.add(selfId);
    const walk = (p: number) =>
      all.filter((c) => c.parentId === p).forEach((c) => {
        banned.add(c.id);
        walk(c.id);
      });
    walk(selfId);
  }
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) =>
    all
      .filter((c) => c.parentId === parent && !banned.has(c.id))
      .forEach((c) => {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      });
  walk(null, 0);
  return out;
}

export default function CategoryForm({
  kind,
  initial,
  all,
  siteUrl,
}: {
  kind: CategoryKind;
  initial: CategoryFormData;
  all: CategoryOpt[];
  siteUrl: string;
}) {
  const cfg = CFG[kind];
  const router = useRouter();
  const isNew = !initial.id;
  const formRef = useRef<HTMLFormElement>(null);
  const { toast, setToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugAuto, setSlugAuto] = useState(isNew);
  const [banner, setBanner] = useState(initial.banner);
  const [featured, setFeatured] = useState(initial.isFeatured);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDesc, setMetaDesc] = useState(initial.metaDescription);
  const [noindex, setNoindex] = useState(initial.noindex);
  const [nofollow, setNofollow] = useState(initial.nofollow);

  const parents = useMemo(() => parentOptions(all, initial.id), [all, initial.id]);
  const url = `${siteUrl.replace(/\/$/, "")}${cfg.publicUrl(slug || "duong-dan", initial.id)}`;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("created")) {
      setToast({ type: "success", text: `Đã tạo ${cfg.noun}` });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [setToast, cfg.noun]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await cfg.save(new FormData(e.currentTarget));
      if (!res.ok) return setToast({ type: "error", text: res.error });
      setDirty(false);
      if (res.created) return router.replace(`${cfg.edit(res.id)}?created=1`);
      setSlug(res.slug);
      setToast({ type: "success", text: "Đã lưu thay đổi" });
      router.refresh();
    } catch {
      setToast({ type: "error", text: "Mất kết nối hoặc phiên đăng nhập hết hạn. Hãy thử lại." });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial.id || !confirm(`Xoá ${cfg.noun} “${initial.name}”?`)) return;
    setDeleting(true);
    const f = new FormData();
    f.append("id", String(initial.id));
    const res = await cfg.del(f);
    setDeleting(false);
    if (!res.ok) return setToast({ type: "error", text: res.error || "Xoá thất bại" });
    setDirty(false);
    router.replace(cfg.list);
  }

  const back = (e: React.MouseEvent) => {
    if (dirty && !confirm("Bạn có thay đổi chưa lưu. Vẫn rời trang?")) e.preventDefault();
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={markDirty} onChange={markDirty} className="pb-24">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Link href={cfg.list} onClick={back} className={btnCls.icon} title="Về danh sách">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {isNew ? `Thêm ${cfg.noun}` : name || `Sửa ${cfg.noun}`}
            </h1>
            <p className="text-xs text-slate-500">
              {dirty ? (
                <span className="text-amber-600">● Có thay đổi chưa lưu</span>
              ) : isNew ? (
                `${cfg.noun[0].toUpperCase()}${cfg.noun.slice(1)} mới`
              ) : (
                `${initial.itemCount ?? 0} ${cfg.item}`
              )}
            </p>
          </div>
          {!isNew && (
            <a href={cfg.publicUrl(initial.slug, initial.id)} target="_blank" rel="noreferrer" className={`${btnCls.secondary} hidden sm:inline-flex`}>
              <ExternalLink size={16} /> Xem trên web
            </a>
          )}
          <button type="submit" className={btnCls.primary} disabled={saving} title="Ctrl + S">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Đang lưu…" : isNew ? "Tạo" : "Lưu"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Thông tin">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Tên ${cfg.noun}`} required className="sm:col-span-2">
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (slugAuto) setSlug(slugify(e.target.value));
                  }}
                  className={`${inputCls} text-base`}
                  placeholder={kind === "product" ? "VD: Máy hút chân không" : "VD: Kinh nghiệm chọn máy"}
                />
              </Field>
              <Field
                label="Đường dẫn (slug)"
                className="sm:col-span-2"
                hint={
                  <>
                    <span className="break-all">{url}</span>
                    {!isNew && kind === "product" && slug !== initial.slug && (
                      <span className="mt-0.5 block text-amber-600">Đổi slug: link cũ sẽ tự chuyển hướng sang link mới.</span>
                    )}
                  </>
                }
                extra={
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => {
                      setSlug(slugify(name));
                      setSlugAuto(true);
                      markDirty();
                    }}
                  >
                    Tạo lại từ tên
                  </button>
                }
              >
                <input
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    setSlugAuto(false);
                  }}
                  onBlur={() => setSlug((s) => slugify(s))}
                  className={`${inputCls} font-mono text-[13px]`}
                />
              </Field>
              <Field label={`${cfg.noun[0].toUpperCase()}${cfg.noun.slice(1)} cha`} hint="Để trống nếu là mục gốc (hiện trên menu chính)">
                <select name="parentId" defaultValue={initial.parentId ?? ""} className={inputCls}>
                  <option value="">— Không có (mục gốc) —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Thứ tự hiển thị" hint="Số nhỏ hiện trước">
                <input name="order" type="number" defaultValue={initial.order} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Ảnh banner" desc={kind === "product" ? "Hiện ở đầu trang danh mục và ở ô danh mục ngoài trang chủ." : "Ảnh đại diện cho chuyên mục."}>
            <ImagePicker
              name="banner"
              value={banner}
              onChange={(u) => {
                setBanner(u);
                markDirty();
              }}
              folder={cfg.folder}
              hint="Ảnh ngang, tối thiểu 1200px chiều rộng."
            />
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {kind === "product" && (
            <Card title="Hiển thị">
              <Switch
                name="isFeatured"
                checked={featured}
                onChange={setFeatured}
                label="Hiện ở trang chủ"
                desc="Đưa vào khối danh mục nổi bật ở trang chủ"
              />
            </Card>
          )}

          <Card title="SEO – Google" desc="Để trống sẽ tự lấy tên danh mục.">
            <div className="mb-4 rounded-lg border border-slate-200 p-3">
              <div className="truncate text-xs text-slate-500">{url.replace(/^https?:\/\//, "")}</div>
              <div className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{metaTitle || name || `Tên ${cfg.noun}`}</div>
              <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-slate-600">{metaDesc || "Mô tả ngắn hiển thị trên Google…"}</div>
            </div>
            <div className="space-y-4">
              <Field label="Tiêu đề SEO" extra={<CharCount value={metaTitle} min={40} max={60} />}>
                <input name="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={name} className={inputCls} />
              </Field>
              <Field label="Mô tả SEO" extra={<CharCount value={metaDesc} min={120} max={160} />}>
                <textarea name="metaDescription" rows={4} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className={inputCls} />
              </Field>
              <details className="rounded-lg border border-slate-200">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-600">
                  Nâng cao <span className="text-xs font-normal text-slate-400">(ít khi cần sửa)</span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <Field label="Ảnh chia sẻ (OG image)" hint="Để trống → dùng ảnh banner">
                    <input name="ogImage" defaultValue={initial.ogImage} className={inputCls} placeholder="https://…" />
                  </Field>
                  <Field label="Canonical URL">
                    <input name="canonicalUrl" defaultValue={initial.canonicalUrl} className={inputCls} placeholder="https://…" />
                  </Field>
                  <Switch name="noindex" checked={noindex} onChange={setNoindex} label="Ẩn khỏi Google (noindex)" />
                  <Switch name="nofollow" checked={nofollow} onChange={setNofollow} label="Nofollow" />
                </div>
              </details>
            </div>
          </Card>

          {!isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Xoá {cfg.noun}
            </button>
          )}
        </aside>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </form>
  );
}
