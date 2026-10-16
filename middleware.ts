// middleware.ts
// Lớp chặn thứ nhất cho /admin và /api/admin. Lớp chặn chính vẫn là requireAdmin()
// trong từng Server Action / Route Handler (vì Server Action có thể gọi từ bất kỳ URL nào).
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Trang đăng nhập (kể cả Server Action loginAction POST vào đây) luôn được qua
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  // API, hoặc request không phải GET (Server Action, form POST…) → 401, không redirect
  const isApi = pathname.startsWith("/api/");
  if (isApi || req.method !== "GET") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname + (search || ""))}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};