// components/PageViewTracker.tsx
// Ghi nhận lượt xem trang → Admin > Lượt truy cập. Gắn 1 lần trong layout (chỉ phần website, không ở admin).
// - Mỗi trình duyệt có 1 mã ngẫu nhiên (localStorage) để đếm số khách, không phải thông tin cá nhân.
// - Phiên (lượt truy cập) hết hạn sau 30 phút không hoạt động, giống Google Analytics.
// - Bot (Googlebot render JS…) bị lọc ở server; ở đây bỏ thêm trình duyệt tự động (navigator.webdriver).
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VID_KEY = "mcb_vid";
const SESSION_KEY = "mcb_sess";
const SESSION_IDLE_MS = 30 * 60 * 1000;

let last = { page: "", at: 0 };

function randomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
}

function getVisitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = randomId();
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return randomId();
  }
}

/** true nếu đây là trang đầu tiên của 1 lượt truy cập mới */
function touchSession() {
  const now = Date.now();
  try {
    const lastAt = Number(localStorage.getItem(SESSION_KEY) || 0);
    localStorage.setItem(SESSION_KEY, String(now));
    return !lastAt || now - lastAt > SESSION_IDLE_MS;
  } catch {
    return true;
  }
}

/** Khách đến từ đâu: google, facebook, zalo… */
function detectSource(): { source: string; ref?: string } {
  const qs = new URLSearchParams(window.location.search);
  const utm = (qs.get("utm_source") || "").toLowerCase();
  let host = "";
  try {
    if (document.referrer) host = new URL(document.referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {}
  if (host === window.location.hostname.replace(/^www\./, "")) host = ""; // tự giới thiệu chính mình

  const s = `${utm} ${host}`;
  let source = "direct";
  if (qs.has("gclid") || /google/.test(s)) source = "google";
  else if (qs.has("fbclid") || /facebook|fb\.|^fb$|messenger|instagram/.test(s)) source = "facebook";
  else if (qs.has("zarsrc") || /zalo/.test(s)) source = "zalo";
  else if (/youtube|youtu\.be/.test(s)) source = "youtube";
  else if (/tiktok/.test(s)) source = "tiktok";
  else if (/bing/.test(s)) source = "bing";
  else if (/coccoc/.test(s)) source = "coccoc";
  else if (host || utm) source = "other";
  return { source, ref: host || utm || undefined };
}

function send(body: string) {
  try {
    const ok = navigator.sendBeacon?.("/api/pageview", new Blob([body], { type: "application/json" }));
    if (!ok) fetch("/api/pageview", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {}
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if ((navigator as any).webdriver) return; // trình duyệt điều khiển tự động (bot, test)

    // chống đếm trùng (React chạy effect 2 lần ở dev, hoặc re-render)
    const now = Date.now();
    if (last.page === pathname && now - last.at < 2000) return;
    last = { page: pathname, at: now };

    const entry = touchSession();
    const payload: Record<string, unknown> = {
      page: pathname.slice(0, 300),
      vid: getVisitorId(),
      entry,
      device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    };
    if (entry) Object.assign(payload, detectSource());
    send(JSON.stringify(payload));
  }, [pathname]);

  return null;
}
