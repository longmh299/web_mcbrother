// lib/rate-limit.ts
// Giới hạn số request theo key (thường là IP) trong một khoảng thời gian.
// Lưu trong bộ nhớ: phù hợp 1 server (VPS/local). Trên serverless mỗi instance đếm riêng,
// nên chỉ là lớp chặn cơ bản; cần chặt hơn thì dùng Redis (Upstash…).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Trả về true nếu còn được phép, false nếu đã vượt giới hạn.
 * @param key     ví dụ `contact:${ip}`
 * @param limit   số lần tối đa trong cửa sổ
 * @param windowMs độ dài cửa sổ (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  // dọn rác thỉnh thoảng để Map không phình mãi
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/** Lấy IP client từ header (sau proxy / CDN). */
export function clientIp(h: Headers) {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}