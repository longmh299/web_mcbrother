// app/api/ai/seo/route.ts
// Gợi ý Tiêu đề SEO + Mô tả SEO (+ mô tả ngắn nếu đang trống) cho sản phẩm / bài viết.
// - Có ANTHROPIC_API_KEY → dùng Claude (claude-haiku-5-5); không có thì OPENAI_API_KEY → gpt-4o-mini
// - Không có key / AI lỗi → tự ghép theo quy tắc từ tên, danh mục, mô tả sẵn có
// CHỈ admin được gọi. Chỉ trả gợi ý, KHÔNG tự lưu — admin xem lại rồi bấm Lưu.
import { NextResponse } from "next/server";
import { denyIfNotAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { stripHtml, googleTitleOf, TITLE_MAX, DESC_MAX } from "@/lib/seo-audit";
import { aiProvider, askAI } from "@/lib/ai-text";

export const runtime = "nodejs";

type Body = {
  kind?: "product" | "post";
  name?: string;
  category?: string | null;
  short?: string | null;
  content?: string | null;
  specs?: string | null;
  avoidTitles?: string[]; // tiêu đề các trang khác, để AI tránh trùng
};

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Cắt ở ranh giới từ, không vượt max */
function fit(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/[\s,.;:–-]+\S*$/, "").trim();
}

/** Bỏ các từ "lửng" ở cuối sau khi cắt (VD: "... inox 304 công") */
const DANGLING = new Set(["công", "và", "cho", "loại", "dạng", "có", "với", "của", "inox", "máy", "chất", "tự", "bán", "độ", "-", "–"]);
function trimDangling(s: string) {
  const w = s.split(" ");
  while (w.length > 3 && DANGLING.has(w[w.length - 1].toLowerCase())) w.pop();
  return w.join(" ").replace(/[,;:–-]+$/, "").trim();
}

/** Gợi ý không cần AI */
function ruleBased(b: Required<Pick<Body, "kind" | "name">> & Body) {
  const name = b.name.trim().replace(/\s+/g, " ");
  // Tiêu đề: Google tự gắn " | MCBROTHER" (12 ký tự) → còn ~48 ký tự
  const room = TITLE_MAX - 12;
  let title = trimDangling(fit(name, room));
  if (b.kind === "product" && title.length < room - 16) title = `${title} chính hãng, giá tốt`;

  // Mô tả: giữ nguyên câu kết (lời kêu gọi), rút gọn phần thân cho vừa 155 ký tự
  const base = stripHtml((b.short || b.content || "").replace(/\s*\r?\n+\s*/g, ", "));
  const tail = b.kind === "product" ? " Lắp đặt tận nơi, bảo hành – nhận báo giá ngay." : "";
  const body = b.kind === "product" ? `${name}${base ? `: ${base}` : " – máy chính hãng, vận hành ổn định"}` : base || name;
  const room2 = DESC_MAX - 5 - tail.length;
  let main = body.length > room2 ? trimDangling(fit(body, room2)) : body;
  main = main.replace(/[.,;:\s]+$/, "") + ".";
  const desc = `${main}${tail}`;

  const short = b.kind === "product" && !b.short?.trim() && base ? fit(base, 300) : undefined;
  return { metaTitle: title, metaDescription: desc, short, source: "rule" as const };
}

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => ({}))) as Body;
  const kind = b.kind === "post" ? "post" : "product";
  const name = clip(b.name, 200);
  if (!name) return NextResponse.json({ ok: false, error: "Thiếu tên" }, { status: 400 });

  const input = {
    kind,
    name,
    category: clip(b.category, 100) || null,
    short: clip(stripHtml(b.short), 600) || null,
    content: clip(stripHtml(b.content), 1800) || null,
    specs: clip(b.specs, 400) || null,
  } as const;

  // ✅ nói rõ vì sao không dùng được AI: chưa có key trên server, hay có key nhưng OpenAI báo lỗi (hết tiền, key sai…)
  const fallback = (aiError?: string) =>
    NextResponse.json({ ok: true, ...ruleBased({ ...input, short: b.short }), aiError: aiError ?? (aiProvider() ? undefined : "no-key") });

  if (!aiProvider()) return fallback("no-key");
  // tối đa 60 lần gợi ý / 10 phút (đủ cho gợi ý hàng loạt cả trang)
  if (!rateLimit("ai-seo", 60, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Gọi AI quá nhiều, thử lại sau ít phút." }, { status: 429 });
  }

  const avoid = (b.avoidTitles ?? []).slice(0, 30).map((t) => `- ${clip(t, 80)}`).join("\n");
  const wantShort = kind === "product" && !b.short?.trim();

  const prompt = `Bạn là chuyên gia SEO cho website bán máy chế biến & đóng gói thực phẩm công nghiệp MCBROTHER (TP.HCM, giao toàn quốc, lắp đặt tận nơi, bảo hành).
Viết bằng tiếng Việt có dấu, tự nhiên, không nhồi từ khoá, không bịa thông số không có trong dữ liệu, không dùng emoji, không viết HOA toàn bộ.

Dữ liệu ${kind === "product" ? "sản phẩm" : "bài viết"}:
- Tên: ${input.name}
${input.category ? `- Danh mục: ${input.category}\n` : ""}${input.specs ? `- Thông số: ${input.specs}\n` : ""}${input.short ? `- Mô tả ngắn: ${input.short}\n` : ""}${input.content ? `- Nội dung: ${input.content}\n` : ""}
Yêu cầu:
1. "metaTitle": tối đa ${TITLE_MAX - 12} ký tự (hệ thống tự thêm " | MCBROTHER" phía sau). Bắt đầu bằng từ khoá chính (loại máy + model nếu có).${
    avoid ? `\n   Không được trùng các tiêu đề đã có:\n${avoid}` : ""
  }
2. "metaDescription": 130–155 ký tự, nêu lợi ích chính + lời kêu gọi (VD: nhận báo giá, tư vấn miễn phí).
${wantShort ? `3. "short": mô tả ngắn 3–4 dòng, mỗi dòng 1 ý nổi bật (cách nhau bằng \\n), chỉ dùng thông tin có trong dữ liệu.\n` : ""}
Chỉ trả về JSON: {"metaTitle": "...", "metaDescription": "..."${wantShort ? ', "short": "..."' : ""}}`;

  try {
    const { text } = await askAI({ prompt, maxTokens: 400, temperature: 0.5, json: true });
    const j = JSON.parse(text || "{}");
    // ✅ chấp nhận cả kiểu tên khoá AI hay viết lệch (meta_title, title…)
    j.metaTitle ??= j.meta_title ?? j.title;
    j.metaDescription ??= j.meta_description ?? j.description;
    const metaTitle = fit(String(j.metaTitle ?? "").replace(/\s*\|\s*MCBROTHER\s*$/i, ""), TITLE_MAX - 12);
    const metaDescription = fit(String(j.metaDescription ?? ""), DESC_MAX);
    if (!metaTitle || !metaDescription) {
      console.error("AI_SEO_EMPTY", text.slice(0, 500));
      return fallback(`AI trả về thiếu tiêu đề/mô tả: ${text.slice(0, 120)}`);
    }
    return NextResponse.json({
      ok: true,
      metaTitle,
      metaDescription,
      short: wantShort && j.short ? String(j.short).trim().slice(0, 500) : undefined,
      googleTitle: googleTitleOf(metaTitle),
      source: "ai",
    });
  } catch (e) {
    console.error("AI_SEO_ERROR", e);
    return fallback(String((e as any)?.message || e).slice(0, 200));
  }
}