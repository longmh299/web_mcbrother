// lib/upload-client.ts
// Upload ảnh / video từ trình duyệt (trang admin), có % tiến trình.
//   - Ảnh  → Cloudinary (để web tự resize / WebP / AVIF)
//   - Video → Cloudflare R2 nếu đã cấu hình (/api/upload/r2), chưa thì Cloudinary
// Server chỉ ký (/api/upload/sign), file không đi qua server → không bị giới hạn dung lượng của Vercel.
// File lớn (> 20MB) được chia nhỏ từng phần 20MB rồi gửi lần lượt.

export type UploadKind = "image" | "video";

type Signed = {
  ok: boolean;
  error?: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  params: Record<string, string | number | boolean>;
  resourceType: UploadKind;
  videoTransform?: string;
};

export const MAX_IMAGE_MB = 20;
export const MAX_VIDEO_MB = 1024;
const CHUNK = 20 * 1024 * 1024;

function post(
  url: string,
  fd: FormData | Blob,
  headers: Record<string, string>,
  onProgress?: (loaded: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(fd instanceof FormData ? "POST" : "PUT", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded);
    xhr.onload = () => {
      let json: any = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(json ?? {});
      else reject(new Error(json?.error?.message || `Upload lỗi (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Mất kết nối khi upload"));
    xhr.send(fd);
  });
}

/** Link phát video: bản MP4 đã chuyển đổi (xem được trên mọi trình duyệt). */
function videoUrl(s: Signed, r: any) {
  const t = s.videoTransform ? `${s.videoTransform}/` : "";
  return `https://res.cloudinary.com/${s.cloudName}/video/upload/${t}v${r.version}/${r.public_id}.mp4`;
}

async function signedUpload(file: File, kind: UploadKind, folder: string | undefined, onProgress?: (pct: number) => void) {
  const sr = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, folder }),
  });
  const s: Signed | null = await sr.json().catch(() => null);
  if (!sr.ok || !s?.ok) throw Object.assign(new Error(s?.error || "Không lấy được chữ ký upload"), { noSign: true });

  const endpoint = `https://api.cloudinary.com/v1_1/${s.cloudName}/${kind}/upload`;
  const base = () => {
    const fd = new FormData();
    Object.entries(s.params).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append("api_key", s.apiKey);
    fd.append("signature", s.signature);
    return fd;
  };

  let result: any;
  if (file.size <= CHUNK) {
    const fd = base();
    fd.append("file", file);
    result = await post(endpoint, fd, {}, (l) => onProgress?.(Math.min(99, (l / file.size) * 100)));
  } else {
    // Upload chia phần (chunked) theo chuẩn Cloudinary: cùng X-Unique-Upload-Id, mỗi phần có Content-Range
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    for (let start = 0; start < file.size; start += CHUNK) {
      const end = Math.min(start + CHUNK, file.size);
      const fd = base();
      fd.append("file", file.slice(start, end), file.name);
      result = await post(
        endpoint,
        fd,
        { "X-Unique-Upload-Id": id, "Content-Range": `bytes ${start}-${end - 1}/${file.size}` },
        (l) => onProgress?.(Math.min(99, ((start + l) / file.size) * 100))
      );
    }
  }
  if (!result?.secure_url) throw new Error("Cloudinary không trả về link");
  onProgress?.(100);
  return kind === "video" ? videoUrl(s, result) : (result.secure_url as string);
}

/** Đoán content-type theo đuôi file khi trình duyệt không nhận ra (hay gặp với .mov trên Windows). */
function videoType(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ({ mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm" } as Record<string, string>)[ext || ""] || "";
}

/**
 * Video → Cloudflare R2 (nếu server đã cấu hình R2). Trả null khi chưa cấu hình để dùng Cloudinary.
 */
async function r2VideoUpload(file: File, onProgress?: (pct: number) => void): Promise<string | null> {
  const contentType = videoType(file);
  const r = await fetch("/api/upload/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType, size: file.size }),
  });
  const j = await r.json().catch(() => null);
  if (j && j.configured === false) return null;
  if (!r.ok || !j?.ok) throw new Error(j?.error || "Không lấy được link upload R2");

  try {
    await post(j.uploadUrl, file, { "Content-Type": j.contentType }, (l) => onProgress?.(Math.min(99, (l / file.size) * 100)));
  } catch (e: any) {
    // status 0 / mất kết nối ngay lập tức thường do bucket chưa bật CORS cho tên miền web
    throw new Error(`${e?.message || "Upload lỗi"} — kiểm tra CORS của bucket R2`);
  }
  onProgress?.(100);
  return j.publicUrl as string;
}

/** Đường cũ qua /api/upload (chỉ ảnh, ≤ ~4MB trên Vercel) — dùng khi không ký được. */
async function legacyImageUpload(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!json?.ok || !json.url) throw new Error(json?.error || "Tải ảnh thất bại");
  return json.url as string;
}

/**
 * Upload 1 file, trả về link Cloudinary.
 *   await uploadMedia(file, { kind: "video", folder: "mcbrother/videos", onProgress: setPct })
 */
export async function uploadMedia(
  file: File,
  opts: { kind?: UploadKind; folder?: string; onProgress?: (pct: number) => void } = {}
): Promise<string> {
  const kind: UploadKind = opts.kind || (file.type.startsWith("video/") ? "video" : "image");

  if (kind === "image" && !file.type.startsWith("image/")) throw new Error("Chỉ nhận file ảnh");
  if (kind === "video" && !videoType(file).startsWith("video/")) throw new Error("Chỉ nhận file video");
  const maxMb = kind === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File quá lớn (> ${maxMb}MB)`);

  if (kind === "video") {
    const r2 = await r2VideoUpload(file, opts.onProgress);
    if (r2) return r2;
  }

  try {
    return await signedUpload(file, kind, opts.folder, opts.onProgress);
  } catch (e: any) {
    if (e?.noSign && kind === "image") return legacyImageUpload(file);
    throw e;
  }
}

/** Ảnh thu nhỏ (khung hình giây thứ 1) của video Cloudinary; video khác → null. */
export function cloudinaryVideoPoster(url: string | null | undefined, w = 640) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) return null;
  const t = `so_1,c_limit,w_${w}`;
  // Bỏ transform cũ (nếu có) trước đoạn v123/, thay bằng transform lấy khung hình
  const out = /\/video\/upload\/(?:[^/]+\/)*?(v\d+\/)/.test(url)
    ? url.replace(/\/video\/upload\/(?:[^/]+\/)*?(v\d+\/)/, `/video/upload/${t}/$1`)
    : url.replace("/video/upload/", `/video/upload/${t}/`);
  return out.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, ".jpg");
}
