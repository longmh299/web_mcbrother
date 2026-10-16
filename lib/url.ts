// lib/url.ts
// Kiểm tra URL an toàn. File nhẹ, KHÔNG phụ thuộc DOMPurify → dùng được cả trong client component.

/** Các nguồn được phép nhúng iframe (video). */
export const EMBED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.facebook.com",
  "www.tiktok.com",
  "player.cloudinary.com",
  "res.cloudinary.com",
];

/** URL an toàn cho src/href: chỉ http(s). */
export function isHttpUrl(src: string | null | undefined) {
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Chỉ cho iframe nhúng từ nguồn tin cậy, bắt buộc https. */
export function isAllowedEmbed(src: string | null | undefined) {
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && EMBED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}