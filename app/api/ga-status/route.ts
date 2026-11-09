// app/api/ga-status/route.ts
// Website hỏi trước khi tải Google Analytics: có nên đếm trình duyệt này không?
// Không đếm: admin đang đăng nhập, mạng đã loại trừ (Admin > Lượt truy cập), bot.
// Nhờ vậy số liệu GA không lẫn lượt xem của chính công ty.
import { isAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { isBotUA, isExcludedIp } from "@/lib/track-filter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let reason = "";
  try {
    if (isBotUA(req.headers.get("user-agent") || "")) reason = "bot";
    else if (await isAdmin()) reason = "admin";
    else if (await isExcludedIp(clientIp(req.headers))) reason = "ip";
  } catch {}
  return Response.json({ track: !reason, reason }, { headers: { "Cache-Control": "private, no-store" } });
}
