// lib/price.ts
// Quy tắc giá dùng chung toàn site:
// sản phẩm chưa nhập giá (null) hoặc giá = 0 (mặc định khi tạo sản phẩm) → hiển thị "Liên hệ".

/** true khi sản phẩm có giá thật (> 0) */
export function hasPrice(price?: number | null): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

/** "12.500.000₫" hoặc "Liên hệ" */
export function formatPrice(price?: number | null, contactLabel = "Liên hệ"): string {
  if (!hasPrice(price)) return contactLabel;
  try {
    return new Intl.NumberFormat("vi-VN").format(price) + "₫";
  } catch {
    return `${price}₫`;
  }
}
