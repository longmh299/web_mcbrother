// lib/track.ts
// Ghi nhận lượt khách bấm liên hệ (gọi, Zalo, Messenger, email, báo giá, gửi form).
// Gửi song song: (1) về database của web → xem ở Admin > Thống kê; (2) Google Analytics (nếu có).
import { gaEvent } from "@/lib/Gtag";

export type LeadType = "call" | "zalo" | "messenger" | "email" | "quote" | "form";

export const LEAD_TYPES: Record<LeadType, string> = {
  call: "Gọi điện",
  zalo: "Nhắn Zalo",
  messenger: "Messenger",
  email: "Gửi email",
  quote: "Bấm Báo giá / Liên hệ",
  form: "Gửi form liên hệ",
};

let last = { key: "", at: 0 };

export function trackLead(type: LeadType, label?: string) {
  if (typeof window === "undefined") return;
  const page = window.location.pathname.slice(0, 300);
  if (page.startsWith("/admin")) return;

  // chống đếm trùng khi bấm đúp
  const key = `${type}|${page}|${label ?? ""}`;
  const now = Date.now();
  if (key === last.key && now - last.at < 3000) return;
  last = { key, at: now };

  const body = JSON.stringify({
    type,
    page,
    label: label?.replace(/\s+/g, " ").trim().slice(0, 120) || undefined,
    device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
  });

  // sendBeacon: vẫn gửi được dù trang chuyển sang tel:/zalo ngay sau đó
  try {
    const ok = navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }));
    if (!ok) fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {}

  // Google Analytics 4: sự kiện "generate_lead" (đánh dấu là Key event trong GA để đo chuyển đổi)
  gaEvent("generate_lead", { method: type, page_path: page, button: label });
}

/** Phân loại 1 link: trả về loại liên hệ, hoặc null nếu là link thường */
export function classifyHref(href: string): LeadType | null {
  const h = href.trim().toLowerCase();
  if (h.startsWith("tel:")) return "call";
  if (h.startsWith("mailto:")) return "email";
  if (/^https?:\/\/(chat\.)?zalo\.me\//.test(h) || h.startsWith("https://zalo.me")) return "zalo";
  if (/^https?:\/\/(m\.me|(www\.)?messenger\.com)\//.test(h) || h.includes("facebook.com/messages")) return "messenger";
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin === window.location.origin && u.pathname.replace(/\/$/, "") === "/lien-he") return "quote";
  } catch {}
  return null;
}
