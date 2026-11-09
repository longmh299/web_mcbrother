// app/api/track/route.ts
// Nhận lượt bấm liên hệ từ website (xem lib/track.ts). Không lưu IP / thông tin cá nhân.
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/auth";
import { isBotUA, isExcludedIp } from "@/lib/track-filter";

export const runtime = "nodejs";

const TYPES = new Set(["call", "zalo", "messenger", "email", "quote", "form"]);

// Header "x-track" cho biết lý do (xem ở tab Network khi kiểm tra): saved | skip-admin | skip-bot | skip-ip | ...
const noContent = (why = "skip") => new Response(null, { status: 204, headers: { "x-track": why } });

export async function POST(req: Request) {
  try {
    const ua = req.headers.get("user-agent") || "";
    if (isBotUA(ua)) return noContent("skip-bot");

    const ip = clientIp(req.headers);
    // tối đa 30 lượt / 10 phút / IP (chặn spam làm sai số liệu)
    if (!rateLimit(`track:${ip}`, 30, 10 * 60 * 1000)) return noContent("skip-rate-limit");

    // Không đếm mạng nội bộ (IP loại trừ ở Admin > Lượt truy cập)
    if (await isExcludedIp(ip)) return noContent("skip-ip");

    // Không đếm khi chính admin đang xem web
    if (await isAdmin()) return noContent("skip-admin");

    const j = await req.json().catch(() => null);
    const type = String(j?.type ?? "");
    const page = String(j?.page ?? "");
    if (!TYPES.has(type) || !page.startsWith("/") || page.startsWith("/admin")) return noContent("skip-invalid");

    await prisma.clickEvent.create({
      data: {
        type,
        page: page.slice(0, 300),
        label: j?.label ? String(j.label).replace(/\s+/g, " ").trim().slice(0, 120) || null : null,
        device: j?.device === "mobile" ? "mobile" : j?.device === "desktop" ? "desktop" : null,
      },
    });
    return noContent("saved");
  } catch (e) {
    console.error("TRACK_ERROR", e);
    return noContent("error");
  }
}
