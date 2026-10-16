// lib/session.ts
// Ký & xác minh phiên admin bằng JWT (HS256).
// File này KHÔNG import next/headers để dùng được cả trong middleware (edge runtime).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24h (giây)

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET chưa được đặt hoặc ngắn hơn 32 ký tự");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(username: string) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey());
}

/** Trả về true nếu token hợp lệ, chưa hết hạn và đúng role admin. */
export async function verifySession(token: string | undefined | null) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}