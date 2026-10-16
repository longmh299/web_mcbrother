// lib/auth.ts
// Helper xác thực admin dùng trong Server Action và Route Handler (Node runtime).
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export async function isAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * Gọi ở DÒNG ĐẦU mọi Server Action của admin.
 * Server Action có thể bị gọi thẳng (bỏ qua middleware), nên đây là lớp bảo vệ chính.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }
}

/**
 * Dùng trong Route Handler: trả về Response 401 nếu chưa đăng nhập, ngược lại trả về null.
 *   const denied = await denyIfNotAdmin(); if (denied) return denied;
 */
export async function denyIfNotAdmin() {
  if (await isAdmin()) return null;
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function createSession(username: string) {
  const token = await signSession(username);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete("admin_auth"); // dọn cookie kiểu cũ nếu còn
}