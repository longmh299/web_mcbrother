// components/admin/ui.tsx
// Bộ khung giao diện dùng chung cho các trang quản trị (card, ô nhập, công tắc, ảnh, thông báo).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Film, ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { MAX_IMAGE_MB, MAX_VIDEO_MB, cloudinaryVideoPoster, uploadMedia } from "@/lib/upload-client";

/* ===================== Class dùng chung ===================== */

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 " +
  "disabled:bg-slate-50";

export const btnCls = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50",
  icon:
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent",
  danger:
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600",
};

/* ===================== Card & Field ===================== */

export function Card({
  id,
  title,
  desc,
  actions,
  children,
  className = "",
}: {
  id?: string;
  title?: React.ReactNode;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  extra,
  children,
  className = "",
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {extra}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Đếm ký tự cho SEO: xanh khi trong khoảng tốt, cam khi quá dài */
export function CharCount({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const color = n === 0 ? "text-slate-400" : n > max ? "text-amber-600" : n >= min ? "text-emerald-600" : "text-slate-500";
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {n}/{max}
    </span>
  );
}

/* ===================== Công tắc bật/tắt ===================== */

export function Switch({
  name,
  checked,
  onChange,
  label,
  desc,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {desc && <span className="block text-xs text-slate-500">{desc}</span>}
      </span>
      {/* checkbox thật để form gửi đi "on" */}
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </label>
  );
}

/* ===================== Nút sắp xếp / xoá trong danh sách ===================== */

export function RowControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className={btnCls.icon} disabled={index === 0} onClick={() => onMove(index, index - 1)} title="Lên trên">
        <ArrowUp size={16} />
      </button>
      <button type="button" className={btnCls.icon} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} title="Xuống dưới">
        <ArrowDown size={16} />
      </button>
      <button type="button" className={btnCls.danger} onClick={() => onRemove(index)} title="Xoá">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

/** State danh sách có thêm / sửa / xoá / đổi chỗ */
export function useList<T>(initial: T[], onDirty?: () => void) {
  const [items, setItems] = useState<T[]>(initial);
  const touch = useCallback(() => onDirty?.(), [onDirty]);
  return {
    items,
    setItems,
    add: (item: T) => {
      setItems((a) => [...a, item]);
      touch();
    },
    update: (i: number, patch: Partial<T>) => {
      setItems((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
      touch();
    },
    remove: (i: number) => {
      setItems((a) => a.filter((_, idx) => idx !== i));
      touch();
    },
    move: (from: number, to: number) => {
      setItems((a) => {
        if (to < 0 || to >= a.length) return a;
        const c = [...a];
        const [x] = c.splice(from, 1);
        c.splice(to, 0, x);
        return c;
      });
      touch();
    },
  };
}

/* ===================== Upload ảnh lên Cloudinary ===================== */

async function uploadToCloudinary(file: File, folder?: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Có unsigned preset → upload thẳng; không thì xin chữ ký từ server rồi upload thẳng (lib/upload-client)
  if (cloudName && preset) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    if (folder) fd.append("folder", folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.secure_url) throw new Error(json?.error?.message || "Tải ảnh thất bại");
    return json.secure_url;
  }
  return uploadMedia(file, { kind: "image", folder });
}

function useUploader(folder?: string) {
  const [busy, setBusy] = useState(0);
  const upload = useCallback(
    async (files: File[], onDone: (url: string) => void) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      const lim = MAX_IMAGE_MB * 1024 * 1024;
      const tooBig = imgs.filter((f) => f.size > lim);
      if (tooBig.length) alert(`Có ${tooBig.length} ảnh lớn hơn ${MAX_IMAGE_MB}MB, đã bỏ qua.`);
      const ok = imgs.filter((f) => f.size <= lim);
      setBusy((b) => b + ok.length);
      await Promise.all(
        ok.map(async (f) => {
          try {
            onDone(await uploadToCloudinary(f, folder));
          } catch (e: any) {
            alert(`${f.name}: ${e?.message || "Tải ảnh thất bại"}`);
          } finally {
            setBusy((b) => b - 1);
          }
        })
      );
    },
    [folder]
  );
  return { busy, upload };
}

/** Thu nhỏ ảnh Cloudinary để xem trước cho nhẹ */
function thumb(url: string, w = 320) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/c_limit,f_auto,q_auto,w_${w}/`)
    : url;
}

/* ===================== Ảnh đơn (ảnh đại diện) ===================== */

export function ImagePicker({
  name,
  value,
  onChange,
  folder,
  hint,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(folder);
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <input type="hidden" name={name} value={value} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(Array.from(e.dataTransfer.files).slice(0, 1), onChange);
        }}
        onClick={() => !value && fileRef.current?.click()}
        className={`relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed sm:w-56 ${
          drag ? "border-blue-500 bg-blue-50" : value ? "border-transparent bg-slate-50" : "cursor-pointer border-slate-300 bg-slate-50 hover:border-blue-400"
        }`}
      >
        {busy > 0 ? (
          <Loader2 className="animate-spin text-blue-600" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(value, 480)} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="px-3 text-center text-xs text-slate-500">
            <ImagePlus className="mx-auto mb-1.5 text-slate-400" size={28} />
            Bấm hoặc kéo thả ảnh vào đây
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnCls.secondary} onClick={() => fileRef.current?.click()} disabled={busy > 0}>
            <ImagePlus size={16} /> {value ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          <button type="button" className={btnCls.secondary} onClick={() => setShowUrl((v) => !v)}>
            <Link2 size={16} /> Dán link ảnh
          </button>
          {value && (
            <button type="button" className={`${btnCls.secondary} text-red-600`} onClick={() => onChange("")}>
              <X size={16} /> Gỡ ảnh
            </button>
          )}
        </div>
        {showUrl && (
          <input
            className={inputCls}
            placeholder="https://res.cloudinary.com/…"
            defaultValue={value}
            onBlur={(e) => onChange(e.currentTarget.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onChange(e.currentTarget.value.trim());
              }
            }}
          />
        )}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
        {value && !value.includes("res.cloudinary.com") && (
          <p className="text-xs text-amber-600">Ảnh đang dùng link ngoài — nên tải ảnh lên để tránh bị mất ảnh khi trang gốc xoá.</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload([f], onChange);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ===================== Thư viện nhiều ảnh ===================== */

export type GalleryImage = { url: string; alt: string };

export function GalleryField({
  name,
  initial,
  folder,
  onDirty,
}: {
  name: string;
  initial: GalleryImage[];
  folder?: string;
  onDirty?: () => void;
}) {
  const list = useList<GalleryImage>(initial, onDirty);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(folder);
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState("");

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    list.add({ url: u, alt: "" });
    setUrl("");
  };

  return (
    <div
      className={`space-y-3 rounded-lg ${drag ? "ring-2 ring-blue-500 ring-offset-4" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDrag(false);
        upload(Array.from(e.dataTransfer.files), (u) => list.add({ url: u, alt: "" }));
      }}
    >
      <input type="hidden" name={name} value={JSON.stringify(list.items)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {list.items.map((img, i) => (
          <div key={`${img.url}-${i}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="relative aspect-[4/3] bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(img.url)} alt={img.alt} className="absolute inset-0 h-full w-full object-contain" />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[11px] font-medium text-white">{i + 1}</span>
            </div>
            <div className="space-y-1 border-t border-slate-100 p-1.5">
              <input
                value={img.alt}
                onChange={(e) => list.update(i, { alt: e.target.value })}
                placeholder="Mô tả ảnh (ALT)"
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              />
              <RowControls index={i} total={list.items.length} onMove={list.move} onRemove={list.remove} />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
        >
          {busy > 0 ? (
            <>
              <Loader2 className="animate-spin" /> Đang tải {busy} ảnh…
            </>
          ) : (
            <>
              <ImagePlus size={24} /> Thêm ảnh
              <span className="text-[11px] text-slate-400">chọn nhiều / kéo thả</span>
            </>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Hoặc dán link ảnh rồi bấm Thêm"
          className={inputCls}
        />
        <button type="button" onClick={addUrl} className={btnCls.secondary}>
          Thêm
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          upload(Array.from(e.target.files || []), (u) => list.add({ url: u, alt: "" }));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ===================== Ô ảnh gọn (link + nút tải lên) ===================== */

/** Dùng cho chỗ hẹp (VD: ảnh chia sẻ OG). Vẫn dán link được như cũ, thêm nút tải ảnh từ máy. */
export function ImageUrlInput({
  name,
  defaultValue = "",
  folder,
  placeholder = "Dán link hoặc bấm tải ảnh lên",
  onDirty,
}: {
  name: string;
  defaultValue?: string;
  folder?: string;
  placeholder?: string;
  onDirty?: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(folder);
  const set = (u: string) => {
    setValue(u);
    onDirty?.();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} placeholder={placeholder} />
        <button
          type="button"
          className={`${btnCls.secondary} shrink-0 px-2.5`}
          onClick={() => fileRef.current?.click()}
          disabled={busy > 0}
          title="Tải ảnh từ máy lên"
        >
          {busy > 0 ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </button>
      </div>
      {value && (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(value, 480)} alt="" className="aspect-[1.91/1] w-full object-contain" />
          <button
            type="button"
            onClick={() => set("")}
            className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-slate-500 shadow hover:text-red-600"
            title="Gỡ ảnh"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload([f], set);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ===================== Video (tải lên hoặc dán link) ===================== */

function youtubeEmbed(s: string) {
  try {
    const u = new URL(s);
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v =
        u.searchParams.get("v") ||
        (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
  } catch {}
  return null;
}

function isVideoFileUrl(s: string) {
  try {
    const u = new URL(s);
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(u.pathname) || u.pathname.includes("/video/upload/");
  } catch {
    return false;
  }
}

export function VideoPicker({
  name,
  value,
  onChange,
  folder = "mcbrother/videos",
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const s = value.trim();
  const yt = s ? youtubeEmbed(s) : null;
  const file = s && !yt && isVideoFileUrl(s);
  const poster = cloudinaryVideoPoster(s) || undefined;

  async function doUpload(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|m4v|mov|webm)$/i.test(f.name)) return setErr("File này không phải video.");
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) return setErr(`Video lớn hơn ${MAX_VIDEO_MB}MB.`);
    setErr("");
    setPct(0);
    try {
      const url = await uploadMedia(f, { kind: "video", folder, onProgress: setPct });
      onChange(url);
      setJustUploaded(true);
    } catch (e: any) {
      setErr(e?.message || "Tải video thất bại");
    } finally {
      setPct(null);
    }
  }

  const uploading = pct !== null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDrag(true);
          }
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!uploading) doUpload(e.dataTransfer.files[0]);
        }}
        className={`flex flex-wrap items-center gap-2 rounded-lg ${drag ? "ring-2 ring-blue-500 ring-offset-4" : ""}`}
      >
        <button type="button" className={btnCls.secondary} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
          {uploading ? `Đang tải… ${Math.round(pct!)}%` : s ? "Đổi video (tải lên)" : "Tải video lên"}
        </button>
        {s && !uploading && (
          <button
            type="button"
            className={`${btnCls.secondary} text-red-600`}
            onClick={() => {
              onChange("");
              setJustUploaded(false);
            }}
          >
            <X size={16} /> Gỡ video
          </button>
        )}
        <span className="text-xs text-slate-400">hoặc kéo thả file video vào đây</span>
      </div>

      {uploading && (
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <input
        name={name}
        type="url"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setJustUploaded(false);
        }}
        className={inputCls}
        placeholder="Hoặc dán link YouTube / link video MP4…"
        disabled={uploading}
      />

      {err && <p className="text-xs text-red-600">{err}</p>}
      {justUploaded && (
        <p className="text-xs text-emerald-700">
          {s.includes("res.cloudinary.com")
            ? "Đã tải lên. Video đang được tối ưu, nếu khung xem trước chưa chạy thì đợi vài phút rồi tải lại trang — nhớ bấm Lưu."
            : "Đã tải lên — nhớ bấm Lưu."}
        </p>
      )}
      {justUploaded && /\.mov$/i.test(s) && (
        <p className="text-xs text-amber-600">
          File .MOV có thể không xem được trên Chrome/Android. Nên xuất video sang MP4 (H.264) rồi tải lại.
        </p>
      )}

      {yt && (
        <div className="aspect-video max-w-md overflow-hidden rounded-lg bg-black">
          <iframe src={yt} className="h-full w-full" allowFullScreen title="Xem trước video" />
        </div>
      )}
      {file && (
        <div className="aspect-video max-w-md overflow-hidden rounded-lg bg-black">
          <video key={s} src={poster ? s : `${s}#t=0.1`} poster={poster} className="h-full w-full" controls preload="metadata" />
        </div>
      )}
      {s && !yt && !file && <p className="text-xs text-amber-600">Không nhận dạng được link video.</p>}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          doUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ===================== Thông báo nổi (toast) ===================== */

export type ToastState = { type: "success" | "error"; text: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === "error" ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, setToast };
}

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const ok = toast.type === "success";
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0">
      <div
        role="status"
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          ok ? "bg-slate-900 text-white" : "bg-red-600 text-white"
        }`}
      >
        <span>{ok ? "✓" : "!"}</span>
        <span>{toast.text}</span>
        <button type="button" onClick={onClose} className="ml-1 opacity-70 hover:opacity-100" aria-label="Đóng">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
