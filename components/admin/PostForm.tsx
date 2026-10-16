// components/admin/PostForm.tsx
// Form Viết bài / Sửa bài (dùng chung). Giống form sản phẩm: lưu xong ở lại trang,
// cảnh báo khi rời trang chưa lưu, Ctrl+S để lưu, xem trước Google, tự kiểm tra bài viết.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Loader2, Save, X } from "lucide-react";
import NewsEditor from "@/components/NewsEditor";
import { slugify } from "@/lib/slug";
import { savePost } from "@/app/admin/news/actions";
import { Card, CharCount, Field, ImagePicker, Switch, Toast, btnCls, inputCls, useToast } from "./ui";

export type PostFormData = {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  tags: string[];
  published: boolean;
  categoryId: number | null;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  noindex: boolean;
  nofollow: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PostCategoryOption = { id: number; name: string; parentId: number | null };

function orderCats(cats: PostCategoryOption[]) {
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) =>
    cats
      .filter((c) => c.parentId === parent)
      .forEach((c) => {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      });
  walk(null, 0);
  cats.forEach((c) => !out.some((o) => o.id === c.id) && out.push({ id: c.id, label: c.name }));
  return out;
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }) : "";

/* ---------- Ô nhập tag dạng "chip" ---------- */
function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])].slice(0, 30));
    setDraft("");
  };
  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <input type="hidden" name="tags" value={value.join(", ")} />
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="text-slate-400 hover:text-red-600" aria-label={`Xoá ${t}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : "Gõ rồi nhấn Enter…"}
        className="min-w-[100px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}

export default function PostForm({
  initial,
  categories,
  siteUrl,
}: {
  initial: PostFormData;
  categories: PostCategoryOption[];
  siteUrl: string;
}) {
  const router = useRouter();
  const isNew = !initial.id;
  const formRef = useRef<HTMLFormElement>(null);
  const { toast, setToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugAuto, setSlugAuto] = useState(isNew);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [cover, setCover] = useState(initial.coverImage);
  const [content, setContent] = useState(initial.content);
  const [tags, setTags] = useState(initial.tags);
  const [published, setPublished] = useState(initial.published);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDesc, setMetaDesc] = useState(initial.metaDescription);
  const [noindex, setNoindex] = useState(initial.noindex);
  const [nofollow, setNofollow] = useState(initial.nofollow);

  const mountedAt = useRef(Date.now());
  const catOptions = useMemo(() => orderCats(categories), [categories]);
  const postUrl = `${siteUrl.replace(/\/$/, "")}/tin-tuc/${slug || "duong-dan"}`;
  const seoTitle = metaTitle || title || "Tiêu đề bài viết";
  const seoDesc = metaDesc || excerpt || "Mô tả ngắn hiển thị trên Google…";

  // ----- tự kiểm tra bài viết -----
  const checks = useMemo(() => {
    const text = content.replace(/<[^>]+>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return {
      words,
      list: [
        { ok: !!cover, label: "Có ảnh đại diện" },
        { ok: excerpt.trim().length >= 50, label: "Có mô tả ngắn (≥ 50 ký tự)" },
        { ok: /<h2/i.test(content), label: "Chia mục bằng tiêu đề H2" },
        { ok: words >= 600, label: `Đủ dài (≥ 600 từ) — hiện ${words} từ` },
        { ok: /<img/i.test(content), label: "Có hình minh hoạ trong bài" },
        { ok: /href="\/(san-pham|lien-he)|href="https?:\/\/(www\.)?mcbrother/i.test(content), label: "Có link tới sản phẩm / liên hệ" },
      ],
    };
  }, [content, cover, excerpt]);

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
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("created")) {
      setToast({ type: "success", text: "Đã tạo bài viết" });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [setToast]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await savePost(new FormData(e.currentTarget));
      if (!res.ok) {
        setToast({ type: "error", text: res.error });
        return;
      }
      setDirty(false);
      if (res.created) {
        router.replace(`/admin/news/${res.id}/edit?created=1`);
        return;
      }
      setSlug(res.slug);
      setToast({ type: "success", text: published ? "Đã lưu thay đổi" : "Đã lưu bản nháp" });
      router.refresh();
    } catch {
      setToast({ type: "error", text: "Mất kết nối hoặc phiên đăng nhập hết hạn. Hãy thử lại." });
    } finally {
      setSaving(false);
    }
  }

  const back = (e: React.MouseEvent) => {
    if (dirty && !confirm("Bạn có thay đổi chưa lưu. Vẫn rời trang?")) e.preventDefault();
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={markDirty} onChange={markDirty} className="pb-24">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      {/* ===== Thanh trên cùng ===== */}
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/news" onClick={back} className={btnCls.icon} title="Về danh sách">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">{isNew ? "Viết bài mới" : title || "Sửa bài viết"}</h1>
            <p className="text-xs text-slate-500">
              {dirty ? (
                <span className="text-amber-600">● Có thay đổi chưa lưu</span>
              ) : isNew ? (
                "Bài mới"
              ) : published ? (
                "Đã đăng"
              ) : (
                "Bản nháp"
              )}
            </p>
          </div>
          {!isNew && initial.published && (
            <a href={`/tin-tuc/${initial.slug}`} target="_blank" rel="noreferrer" className={`${btnCls.secondary} hidden sm:inline-flex`}>
              <ExternalLink size={16} /> Xem trên web
            </a>
          )}
          <button type="submit" className={btnCls.primary} disabled={saving} title="Ctrl + S">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Đang lưu…" : isNew ? (published ? "Đăng bài" : "Lưu nháp") : "Lưu"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===================== CỘT CHÍNH ===================== */}
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="space-y-4">
              <input
                name="title"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (slugAuto) setSlug(slugify(e.target.value));
                }}
                placeholder="Tiêu đề bài viết…"
                className="w-full border-0 bg-transparent p-0 text-2xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0"
              />
              <Field
                label="Đường dẫn (slug)"
                hint={
                  <>
                    <span className="break-all">{postUrl}</span>
                    {!isNew && slug !== initial.slug && (
                      <span className="mt-0.5 block text-amber-600">Đổi slug: link cũ sẽ tự chuyển hướng sang link mới.</span>
                    )}
                  </>
                }
                extra={
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline"
                    onClick={() => {
                      setSlug(slugify(title));
                      setSlugAuto(true);
                      markDirty();
                    }}
                  >
                    Tạo lại từ tiêu đề
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
              <Field
                label="Mô tả ngắn (sapo)"
                extra={<CharCount value={excerpt} min={100} max={200} />}
                hint="Hiển thị ngay dưới tiêu đề và ở danh sách bài viết. 1–2 câu tóm tắt nội dung chính."
              >
                <textarea name="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Ảnh đại diện">
            <ImagePicker
              name="coverImage"
              value={cover}
              onChange={(u) => {
                setCover(u);
                markDirty();
              }}
              folder="mcbrother/posts"
              hint="Ảnh ngang tỉ lệ 1200×630 là đẹp nhất (dùng luôn khi chia sẻ Facebook/Zalo)."
            />
          </Card>

          <Card title="Nội dung bài viết" desc="Dán từ Word/ChatGPT được — hệ thống tự làm sạch định dạng. Dùng H2 cho các mục lớn, H3 cho mục nhỏ.">
            <NewsEditor
              name="content"
              value={initial.content}
              height={640}
              bare
              onChange={(html) => {
                setContent(html);
                if (Date.now() - mountedAt.current > 1500) markDirty();
              }}
            />
          </Card>
        </div>

        {/* ===================== CỘT PHẢI ===================== */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="Xuất bản">
            <div className="space-y-4">
              <Switch
                name="published"
                checked={published}
                onChange={setPublished}
                label="Hiển thị trên website"
                desc={published ? "Khách đang đọc được" : "Bản nháp – chỉ admin thấy"}
              />
              <Field label="Chuyên mục">
                <select name="categoryId" defaultValue={initial.categoryId ?? ""} className={inputCls}>
                  <option value="">— Chưa chọn —</option>
                  {catOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Thẻ (tags)" hint="Nhấn Enter hoặc dấu phẩy để thêm">
                <TagsInput
                  value={tags}
                  onChange={(v) => {
                    setTags(v);
                    markDirty();
                  }}
                />
              </Field>
              {!isNew && (
                <dl className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <dt>Ngày tạo</dt>
                    <dd>{fmt(initial.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Cập nhật</dt>
                    <dd>{fmt(initial.updatedAt)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </Card>

          <Card title="Kiểm tra bài viết" desc="Gợi ý để bài dễ lên Google hơn — không bắt buộc.">
            <ul className="space-y-2 text-sm">
              {checks.list.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      c.ok ? "bg-emerald-500 text-white" : "border border-slate-300"
                    }`}
                  >
                    {c.ok && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className={c.ok ? "text-slate-700" : "text-slate-500"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="SEO – Google" desc="Để trống sẽ tự lấy tiêu đề & mô tả ngắn.">
            <div className="mb-4 rounded-lg border border-slate-200 p-3">
              <div className="truncate text-xs text-slate-500">{postUrl.replace(/^https?:\/\//, "")}</div>
              <div className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{seoTitle}</div>
              <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-slate-600">{seoDesc}</div>
            </div>
            <div className="space-y-4">
              <Field label="Tiêu đề SEO" extra={<CharCount value={metaTitle} min={40} max={60} />}>
                <input name="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title || "Tiêu đề trên Google"} className={inputCls} />
              </Field>
              <Field label="Mô tả SEO" extra={<CharCount value={metaDesc} min={120} max={160} />}>
                <textarea
                  name="metaDescription"
                  rows={4}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder={excerpt || "1–2 câu tóm tắt, có từ khoá chính"}
                  className={inputCls}
                />
              </Field>
              <details className="rounded-lg border border-slate-200">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-600">
                  Nâng cao <span className="text-xs font-normal text-slate-400">(ít khi cần sửa)</span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <Field label="Ảnh chia sẻ (OG image)" hint="Để trống → dùng ảnh đại diện">
                    <input name="ogImage" defaultValue={initial.ogImage} className={inputCls} placeholder="https://…" />
                  </Field>
                  <Field label="Canonical URL" hint="Chỉ điền khi bài này trùng nội dung với trang khác">
                    <input name="canonicalUrl" defaultValue={initial.canonicalUrl} className={inputCls} placeholder="https://…" />
                  </Field>
                  <Switch name="noindex" checked={noindex} onChange={setNoindex} label="Ẩn khỏi Google (noindex)" />
                  <Switch name="nofollow" checked={nofollow} onChange={setNofollow} label="Nofollow" />
                </div>
              </details>
            </div>
          </Card>
        </aside>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </form>
  );
}
