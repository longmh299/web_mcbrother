// lib/cloudinary.ts
// Thêm transform Cloudinary để ảnh được resize + nén + đổi định dạng (WebP/AVIF) tự động.
// Ảnh không phải Cloudinary → giữ nguyên URL.

type Mode = "fit" | "fill" | "limit";

/**
 * cld(url, 800)            → rộng tối đa 800px, giữ tỉ lệ
 * cld(url, 600, 400, "fill") → cắt đúng khung 600x400 (tự chọn vùng quan trọng)
 */
export function cld(
  url: string | null | undefined,
  w: number,
  h?: number,
  mode: Mode = "limit"
): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("res.cloudinary.com") || !u.pathname.includes("/upload/")) {
      return url;
    }
    const parts = [`c_${mode}`, "f_auto", "q_auto", `w_${w}`];
    if (h) parts.push(`h_${h}`);
    if (mode === "fill") parts.push("g_auto");
    return url.replace("/upload/", `/upload/${parts.join(",")}/`);
  } catch {
    return url;
  }
}