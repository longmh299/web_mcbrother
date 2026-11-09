// app/api/pageview/route.ts
// Nhận lượt xem trang từ website (xem components/PageViewTracker.tsx).
// KHÔNG đếm: bot Google và mọi bot khác, admin đang đăng nhập, IP loại trừ (mạng công ty).
// Không lưu IP / thông tin cá nhân.
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/auth";
import { isBotUA, isExcludedIp } from "@/lib/track-filter";

export const runtime = "nodejs";

const SOURCES = new Set(["google", "facebook", "zalo", "youtube", "tiktok", "bing", "coccoc", "other", "direct"]);

// Header "x-track" cho biết lý do (xem ở tab Network khi kiểm tra): saved | skip-bot | skip-ip | skip-admin | ...
const noContent = (why = "skip") => new Response(null, { status: 204, headers: { "x-track": why } });

export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") || "";
    if (isBotUA(ua)) return noContent("skip-bot");

    const ip = clientIp(req.headers);
    // tối đa 120 trang / 10 phút / IP (chặn spam, F5 liên tục)
    if (!rateLimit(`pv:${ip}`, 120, 10 * 60 * 1000)) return noContent("skip-rate-limit");

    if (await isExcludedIp(ip)) return noContent("skip-ip");
    if (await isAdmin()) return noContent("skip-admin");

    const j = await req.json().catch(() => null);
    const page = String(j?.page ?? "");
    const visitorId = String(j?.vid ?? "");
    if (!page.startsWith("/") || page.startsWith("/admin") || page.startsWith("/api")) return noContent("skip-invalid");
    if (!/^[a-z0-9-]{8,40}$/i.test(visitorId)) return noContent("skip-invalid");

    const isEntry = j?.entry === true;
    const source = isEntry && SOURCES.has(String(j?.source)) ? String(j.source) : null;
    const referrer =
      isEntry && j?.ref ? String(j.ref).toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 120) || null : null;

    await prisma.pageView.create({
      data: {
        page: page.slice(0, 300),
        visitorId,
        isEntry,
        source,
        referrer,
        device: j?.device === "mobile" ? "mobile" : j?.device === "desktop" ? "desktop" : null,
      },
    });
    return noContent("saved");
  } catch (e) {
    console.error("PAGEVIEW_ERROR", e);
    return noContent("error");
  }
}
