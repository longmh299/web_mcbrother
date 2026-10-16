"use server";

import { createHash, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";

type State = { error?: string } | null;

/* ---------- Giới hạn đăng nhập sai (theo IP) ----------
 * Lưu trong bộ nhớ: đủ dùng cho 1 server (VPS/local).
 * Nếu deploy serverless (Vercel), mỗi instance có bộ đếm riêng → chỉ là lớp chặn cơ bản.
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

function isLocked(ip: string) {
  const f = fails.get(ip);
  if (!f) return false;
  if (Date.now() > f.until) {
    fails.delete(ip);
    return false;
  }
  return f.count >= MAX_FAILS;
}
function recordFail(ip: string) {
  const f = fails.get(ip);
  const now = Date.now();
  if (!f || now > f.until) fails.set(ip, { count: 1, until: now + LOCK_MS });
  else f.count++;
}

/** So sánh chuỗi an toàn trước timing attack (băm trước để 2 buffer luôn cùng độ dài). */
function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Chỉ cho phép đường dẫn nội bộ, chặn "//evil.com" và "/\evil.com". */
function safeNextPath(next: string) {
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/admin";
  return next;
}

export async function loginAction(_prev: State, formData: FormData): Promise<State> {
  const user = String(formData.get("user") ?? "");
  const pass = String(formData.get("pass") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));

  const U = process.env.ADMIN_USER;
  const P = process.env.ADMIN_PASS;
  if (!U || !P) {
    // Không còn fallback admin/admin123
    return { error: "Server chưa cấu hình ADMIN_USER / ADMIN_PASS" };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  if (isLocked(ip)) {
    return { error: "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút." };
  }

  // Luôn so sánh cả 2 (không dùng ||) để thời gian phản hồi như nhau
  const okUser = safeEqual(user, U);
  const okPass = safeEqual(pass, P);
  if (!(okUser && okPass)) {
    recordFail(ip);
    await new Promise((r) => setTimeout(r, 500)); // làm chậm brute-force
    return { error: "Sai tài khoản hoặc mật khẩu" };
  }

  fails.delete(ip);
  await createSession(user);
  redirect(next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}