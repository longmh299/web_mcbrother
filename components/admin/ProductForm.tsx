// components/admin/ProductForm.tsx
// Form Thêm / Sửa sản phẩm (dùng chung). Lưu xong ở lại trang + hiện thông báo,
// cảnh báo khi rời trang mà chưa lưu, Ctrl+S để lưu nhanh.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import RichEditor from "@/components/RichEditor";
import { slugify } from "@/lib/slug";
import { saveProduct } from "@/app/admin/products/actions";
import {
  Card,
  CharCount,
  Field,
  GalleryField,
  ImagePicker,
  RowControls,
  Switch,
  Toast,
  btnCls,
  inputCls,
  useList,
  useToast,
  type GalleryImage,
} from "./ui";

/* ===================== Kiểu dữ liệu ===================== */

export type ProductFormData = {
  id?: number;
  name: string;
  slug: string;
  sku: string;
  price: number | null;
  categoryId: number | null;
  short: string;
  description: string;
  coverImage: string;
  images: GalleryImage[];
  videoUrl: string;
  published: boolean;
  isFeatured: boolean;
  power: string;
  voltage: string;
  weight: string;
  dimensions: string;
  functions: string;
  material: string;
  warranty: string;
  attributes: { name: string; value: string }[];
  specTable: { columns: string[]; rows: { label: string; values: string[] }[] } | null;
  faqs: { question: string; answer: string }[];
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  noindex: boolean;
  nofollow: boolean;
};

export type CategoryOption = { id: number; name: string; parentId: number | null };

const WARRANTY = [
  { v: "6 tháng", l: "6 tháng" },
  { v: "12 tháng", l: "12 tháng" },
  { v: "18 tháng", l: "18 tháng" },
  { v: "24 tháng", l: "24 tháng" },
  { v: "0 tháng", l: "Không bảo hành (vật tư tiêu hao)" },
];

const SPECS: { key: keyof ProductFormData; label: string; ph: string }[] = [
  { key: "power", label: "Công suất", ph: "VD: 1.5kW" },
  { key: "voltage", label: "Điện áp", ph: "VD: 220V/50Hz" },
  { key: "weight", label: "Trọng lượng", ph: "VD: 120kg" },
  { key: "dimensions", label: "Kích thước", ph: "VD: 1200×800×1500mm" },
  { key: "functions", label: "Chức năng", ph: "VD: Hút chân không, hàn miệng túi" },
  { key: "material", label: "Vật liệu", ph: "VD: Inox 304" },
];


/** Danh mục cha → con (thụt lề) cho ô chọn */
function orderCategories(cats: CategoryOption[]) {
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) => {
    cats
      .filter((c) => c.parentId === parent)
      .forEach((c) => {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      });
  };
  walk(null, 0);
  // danh mục có cha không tồn tại → vẫn hiện
  cats.forEach((c) => !out.some((o) => o.id === c.id) && out.push({ id: c.id, label: c.name }));
  return out;
}

const fmtPrice = (digits: string) => (digits ? Number(digits).toLocaleString("vi-VN") : "");

function videoPreview(raw: string): { type: "yt" | "mp4"; src: string } | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get("v") || (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : "");
      if (v) return { type: "yt", src: `https://www.youtube.com/embed/${v}` };
    }
    if (u.hostname === "youtu.be") return { type: "yt", src: `https://www.youtube.com/embed/${u.pathname.slice(1)}` };
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname) || u.pathname.includes("/video/upload/")) return { type: "mp4", src: s };
  } catch {}
  return null;
}

/* ===================== Component ===================== */

export default function ProductForm({
  initial,
  categories,
  siteUrl,
}: {
  initial: ProductFormData;
  categories: CategoryOption[];
  siteUrl: string;
}) {
  const router = useRouter();
  const isNew = !initial.id;
  const formRef = useRef<HTMLFormElement>(null);
  const { toast, setToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);

  // ----- trường cần điều khiển -----
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugAuto, setSlugAuto] = useState(isNew); // SP mới: slug tự sinh theo tên
  const [price, setPrice] = useState(initial.price ? String(initial.price) : "");
  const [short, setShort] = useState(initial.short);
  const [cover, setCover] = useState(initial.coverImage);
  const [video, setVideo] = useState(initial.videoUrl);
  const [published, setPublished] = useState(initial.published);
  const [featured, setFeatured] = useState(initial.isFeatured);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDesc, setMetaDesc] = useState(initial.metaDescription);
  const [noindex, setNoindex] = useState(initial.noindex);
  const [nofollow, setNofollow] = useState(initial.nofollow);

  const attrs = useList(initial.attributes, markDirty);
  const faqs = useList(initial.faqs, markDirty);
  const [spec, setSpec] = useState(
    initial.specTable && initial.specTable.columns.length
      ? initial.specTable
      : { columns: [] as string[], rows: [] as { label: string; values: string[] }[] }
  );
  const editSpec = (fn: (s: typeof spec) => typeof spec) => {
    setSpec((s) => fn(structuredClone(s)));
    markDirty();
  };

  // TinyMCE báo "thay đổi" cả lúc khởi tạo → bỏ qua 1.5s đầu
  const mountedAt = useRef(Date.now());

  const catOptions = useMemo(() => orderCategories(categories), [categories]);
  const warrantyOpts = useMemo(
    () =>
      initial.warranty && !WARRANTY.some((w) => w.v === initial.warranty)
        ? [...WARRANTY, { v: initial.warranty, l: initial.warranty }]
        : WARRANTY,
    [initial.warranty]
  );
  const vp = videoPreview(video);
  const productUrl = `${siteUrl.replace(/\/$/, "")}/san-pham/${slug || "duong-dan"}`;
  const seoTitle = metaTitle || name || "Tên sản phẩm";
  const seoDesc = metaDesc || short.replace(/\s+/g, " ").slice(0, 160) || "Mô tả ngắn hiển thị trên Google…";

  // ----- cảnh báo rời trang khi chưa lưu -----
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // ----- Ctrl/Cmd + S để lưu -----
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

  // ----- thông báo sau khi vừa tạo mới (?created=1) -----
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("created")) {
      setToast({ type: "success", text: "Đã tạo sản phẩm" });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [setToast]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await saveProduct(new FormData(e.currentTarget));
      if (!res.ok) {
        setToast({ type: "error", text: res.error });
        return;
      }
      setDirty(false);
      if (res.created) {
        router.replace(`/admin/products/${res.id}/edit?created=1`);
        return;
      }
      setSlug(res.slug);
      setToast({ type: "success", text: "Đã lưu thay đổi" });
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
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={markDirty}
      onChange={markDirty}
      className="pb-24"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="attributes" value={JSON.stringify(attrs.items)} />
      <input type="hidden" name="faqs" value={JSON.stringify(faqs.items)} />
      <input type="hidden" name="specTable" value={JSON.stringify(spec)} />

      {/* ===== Thanh trên cùng (dính khi cuộn) ===== */}
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" onClick={back} className={btnCls.icon} title="Về danh sách">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900">{isNew ? "Thêm sản phẩm" : name || "Sửa sản phẩm"}</h1>
            <p className="text-xs text-slate-500">
              {dirty ? <span className="text-amber-600">● Có thay đổi chưa lưu</span> : isNew ? "Sản phẩm mới" : "Đã lưu"}
            </p>
          </div>
          {!isNew && published && (
            <a href={`/san-pham/${initial.slug}`} target="_blank" rel="noreferrer" className={`${btnCls.secondary} hidden sm:inline-flex`}>
              <ExternalLink size={16} /> Xem trên web
            </a>
          )}
          <button type="submit" className={btnCls.primary} disabled={saving} title="Ctrl + S">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Đang lưu…" : isNew ? "Tạo sản phẩm" : "Lưu"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===================== CỘT CHÍNH ===================== */}
        <div className="min-w-0 space-y-6">
          <Card id="co-ban" title="Thông tin cơ bản">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên sản phẩm" required className="sm:col-span-2">
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (slugAuto) setSlug(slugify(e.target.value));
                  }}
                  className={`${inputCls} text-base`}
                  placeholder="VD: Máy hút chân không 2 buồng DZ-400"
                />
              </Field>

              <Field
                label="Đường dẫn (slug)"
                className="sm:col-span-2"
                hint={
                  <>
                    <span className="break-all">{productUrl}</span>
                    {!isNew && slug !== initial.slug && (
                      <span className="mt-0.5 block text-amber-600">
                        Đổi slug: link cũ sẽ tự chuyển hướng sang link mới (không mất SEO).
                      </span>
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
                  placeholder="may-hut-chan-khong-dz-400"
                />
              </Field>

              <Field label="Mã sản phẩm (SKU)" hint="Không bắt buộc, không được trùng">
                <input name="sku" defaultValue={initial.sku} className={inputCls} placeholder="VD: DZ-400" />
              </Field>

              <Field label="Giá bán (đ)" hint={price ? `${fmtPrice(price)} đ` : "Để trống → hiển thị “Liên hệ”"}>
                <input
                  name="price"
                  inputMode="numeric"
                  value={fmtPrice(price)}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className={inputCls}
                  placeholder="Liên hệ"
                />
              </Field>

              <Field
                label="Mô tả ngắn"
                className="sm:col-span-2"
                hint="Hiển thị cạnh ảnh sản phẩm. Mỗi dòng là 1 ý (VD: Năng suất 30 gói/phút)."
              >
                <textarea name="short" rows={4} value={short} onChange={(e) => setShort(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card id="hinh-anh" title="Hình ảnh & video">
            <div className="space-y-6">
              <Field label="Ảnh đại diện">
                <ImagePicker
                  name="coverImage"
                  value={cover}
                  onChange={(u) => {
                    setCover(u);
                    markDirty();
                  }}
                  folder="mcbrother/products"
                  hint="Ảnh chính hiển thị ở danh sách và đầu trang sản phẩm. Nên dùng ảnh nền trắng, tỉ lệ 4:3."
                />
              </Field>

              <Field label="Thư viện ảnh" hint="Ảnh phụ hiển thị sau ảnh đại diện. Có thể chọn nhiều ảnh cùng lúc.">
                <GalleryField name="images" initial={initial.images} folder="mcbrother/products" onDirty={markDirty} />
              </Field>

              <Field label="Video" hint="Dán link YouTube hoặc link video Cloudinary/MP4.">
                <input
                  name="videoUrl"
                  type="url"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  className={inputCls}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
                {vp && (
                  <div className="mt-3 aspect-video max-w-md overflow-hidden rounded-lg bg-black">
                    {vp.type === "yt" ? (
                      <iframe src={vp.src} className="h-full w-full" allowFullScreen title="Xem trước video" />
                    ) : (
                      <video src={vp.src} className="h-full w-full" controls />
                    )}
                  </div>
                )}
                {video && !vp && <p className="mt-1 text-xs text-amber-600">Không nhận dạng được link video.</p>}
              </Field>
            </div>
          </Card>

          <Card id="noi-dung" title="Nội dung chi tiết" desc="Bài giới thiệu đầy đủ ở phần “Mô tả chi tiết” trên trang sản phẩm.">
            <RichEditor
              name="description"
              value={initial.description}
              onChange={() => {
                if (Date.now() - mountedAt.current > 1500) markDirty();
              }}
            />
          </Card>

          <Card id="thong-so" title="Thông số kỹ thuật" desc="Hiển thị trong bảng thông số cạnh ảnh sản phẩm. Ô để trống sẽ được ẩn.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SPECS.map((s) => (
                <Field key={s.key} label={s.label}>
                  <input name={s.key} defaultValue={String(initial[s.key] ?? "")} placeholder={s.ph} className={inputCls} />
                </Field>
              ))}
              <Field label="Bảo hành">
                <select name="warranty" defaultValue={initial.warranty || "12 tháng"} className={inputCls}>
                  {warrantyOpts.map((w) => (
                    <option key={w.v} value={w.v}>
                      {w.l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-700">Thông số khác</div>
                  <div className="text-xs text-slate-500">VD: Xuất xứ – Trung Quốc, Năng suất – 30 gói/phút</div>
                </div>
              </div>
              <div className="space-y-2">
                {attrs.items.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={a.name}
                      onChange={(e) => attrs.update(i, { name: e.target.value })}
                      placeholder="Tên thông số"
                      className={`${inputCls} w-2/5`}
                    />
                    <input
                      value={a.value}
                      onChange={(e) => attrs.update(i, { value: e.target.value })}
                      placeholder="Giá trị"
                      className={inputCls}
                    />
                    <RowControls index={i} total={attrs.items.length} onMove={attrs.move} onRemove={attrs.remove} />
                  </div>
                ))}
              </div>
              <button type="button" className={`${btnCls.ghost} mt-2`} onClick={() => attrs.add({ name: "", value: "" })}>
                <Plus size={16} /> Thêm thông số
              </button>
            </div>
          </Card>

          <Card
            id="bang-model"
            title="Bảng so sánh model"
            desc="Dùng khi 1 sản phẩm có nhiều model (VD: DZ-400, DZ-500). Mỗi cột là 1 model, mỗi dòng là 1 thông số."
          >
            {spec.columns.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
                <p className="text-sm text-slate-500">Chưa có bảng so sánh.</p>
                <button
                  type="button"
                  className={`${btnCls.secondary} mt-3`}
                  onClick={() => editSpec(() => ({ columns: ["", ""], rows: [{ label: "", values: ["", ""] }] }))}
                >
                  <Plus size={16} /> Tạo bảng
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-44 border-b border-slate-200 p-2 text-left text-xs font-medium text-slate-500">Thông số</th>
                        {spec.columns.map((c, ci) => (
                          <th key={ci} className="border-b border-l border-slate-200 p-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                value={c}
                                onChange={(e) =>
                                  editSpec((s) => {
                                    s.columns[ci] = e.target.value;
                                    return s;
                                  })
                                }
                                placeholder={`Model ${ci + 1}`}
                                className="w-full min-w-[90px] rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                className={btnCls.danger}
                                title="Xoá cột"
                                onClick={() =>
                                  editSpec((s) => ({
                                    columns: s.columns.filter((_, j) => j !== ci),
                                    rows: s.rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== ci) })),
                                  }))
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="w-10 border-b border-slate-200" />
                      </tr>
                    </thead>
                    <tbody>
                      {spec.rows.map((r, ri) => (
                        <tr key={ri} className="border-t border-slate-100">
                          <td className="p-1.5">
                            <input
                              value={r.label}
                              onChange={(e) =>
                                editSpec((s) => {
                                  s.rows[ri].label = e.target.value;
                                  return s;
                                })
                              }
                              placeholder="VD: Công suất"
                              className="w-full rounded border border-slate-200 px-2 py-1 focus:border-blue-500 focus:outline-none"
                            />
                          </td>
                          {spec.columns.map((_, ci) => (
                            <td key={ci} className="border-l border-slate-100 p-1.5">
                              <input
                                value={r.values[ci] ?? ""}
                                onChange={(e) =>
                                  editSpec((s) => {
                                    s.rows[ri].values[ci] = e.target.value;
                                    return s;
                                  })
                                }
                                className="w-full rounded border border-slate-200 px-2 py-1 focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              className={btnCls.danger}
                              title="Xoá dòng"
                              onClick={() =>
                                editSpec((s) => {
                                  s.rows.splice(ri, 1);
                                  return s;
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={btnCls.ghost}
                    onClick={() =>
                      editSpec((s) => {
                        s.rows.push({ label: "", values: s.columns.map(() => "") });
                        return s;
                      })
                    }
                  >
                    <Plus size={16} /> Thêm dòng
                  </button>
                  <button
                    type="button"
                    className={btnCls.ghost}
                    onClick={() =>
                      editSpec((s) => {
                        s.columns.push("");
                        s.rows.forEach((r) => r.values.push(""));
                        return s;
                      })
                    }
                  >
                    <Plus size={16} /> Thêm model (cột)
                  </button>
                  <button
                    type="button"
                    className={`${btnCls.ghost} ml-auto text-red-600 hover:bg-red-50`}
                    onClick={() => confirm("Xoá toàn bộ bảng so sánh?") && editSpec(() => ({ columns: [], rows: [] }))}
                  >
                    Xoá bảng
                  </button>
                </div>
              </>
            )}
          </Card>

          <Card
            id="faq"
            title="Câu hỏi thường gặp (FAQ)"
            desc="Hiển thị cuối trang sản phẩm và giúp Google hiểu nội dung. Câu hỏi/trả lời bỏ trống sẽ không được lưu."
          >
            <div className="space-y-3">
              {faqs.items.map((f, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {i + 1}
                    </span>
                    <input
                      value={f.question}
                      onChange={(e) => faqs.update(i, { question: e.target.value })}
                      placeholder="Câu hỏi — VD: Máy có bảo hành không?"
                      className={`${inputCls} font-medium`}
                    />
                    <RowControls index={i} total={faqs.items.length} onMove={faqs.move} onRemove={faqs.remove} />
                  </div>
                  <textarea
                    value={f.answer}
                    onChange={(e) => faqs.update(i, { answer: e.target.value })}
                    rows={2}
                    placeholder="Câu trả lời"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <button type="button" className={`${btnCls.ghost} mt-2`} onClick={() => faqs.add({ question: "", answer: "" })}>
              <Plus size={16} /> Thêm câu hỏi
            </button>
          </Card>
        </div>

        {/* ===================== CỘT PHẢI ===================== */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card title="Xuất bản">
            <div className="space-y-3">
              <Switch
                name="published"
                checked={published}
                onChange={setPublished}
                label="Hiển thị trên website"
                desc={published ? "Khách đang xem được" : "Đang ẩn (bản nháp)"}
              />
              <Switch
                name="isFeatured"
                checked={featured}
                onChange={setFeatured}
                label="Sản phẩm nổi bật"
                desc="Ưu tiên hiện ở trang chủ"
              />
              <Field label="Danh mục">
                <select name="categoryId" defaultValue={initial.categoryId ?? ""} className={inputCls}>
                  <option value="">— Chưa chọn —</option>
                  {catOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="SEO – Google" desc="Để trống sẽ tự lấy tên & mô tả ngắn.">
            {/* Xem trước kết quả Google */}
            <div className="mb-4 rounded-lg border border-slate-200 p-3">
              <div className="truncate text-xs text-slate-500">{productUrl.replace(/^https?:\/\//, "")}</div>
              <div className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{seoTitle}</div>
              <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-slate-600">{seoDesc}</div>
            </div>

            <div className="space-y-4">
              <Field label="Tiêu đề SEO" extra={<CharCount value={metaTitle} min={40} max={60} />}>
                <input
                  name="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={name || "Tiêu đề trên Google"}
                  className={inputCls}
                />
              </Field>
              <Field label="Mô tả SEO" extra={<CharCount value={metaDesc} min={120} max={160} />}>
                <textarea
                  name="metaDescription"
                  rows={4}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  placeholder="1–2 câu tóm tắt sản phẩm, có từ khoá chính"
                  className={inputCls}
                />
              </Field>

              <details className="group rounded-lg border border-slate-200">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-600">
                  Nâng cao <span className="text-xs font-normal text-slate-400">(ít khi cần sửa)</span>
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <Field label="Ảnh chia sẻ (OG image)" hint="Để trống → dùng ảnh đại diện">
                    <input name="ogImage" defaultValue={initial.ogImage} className={inputCls} placeholder="https://…" />
                  </Field>
                  <Field label="Canonical URL" hint="Chỉ điền khi trang này trùng nội dung với trang khác">
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
