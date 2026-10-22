// app/api/ai/faq/route.ts
// Gợi ý 3–5 câu hỏi thường gặp (FAQ) cho 1 sản phẩm, dựa trên dữ liệu thật của sản phẩm.
// - Có ANTHROPIC_API_KEY / OPENAI_API_KEY → AI viết (xem lib/ai-text.ts)
// - Không có key / AI lỗi → bộ câu hỏi mẫu theo chính sách chung của công ty
//   (chỉ dùng các cam kết đang ghi trên trang sản phẩm: bảo hành, giao toàn quốc, lắp đặt tận nơi)
// CHỈ admin được gọi. Chỉ trả gợi ý, KHÔNG tự lưu — admin đọc lại rồi bấm Lưu.
import { NextResponse } from "next/server";
import { denyIfNotAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/seo-audit";
import { aiProvider, askAI } from "@/lib/ai-text";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

type Faq = { question: string; answer: string };
type Body = {
  name?: string;
  category?: string | null;
  short?: string | null;
  content?: string | null;
  specs?: string | null;
  warranty?: string | null;
  existing?: string[]; // câu hỏi đã có → không viết trùng
  count?: number;
};

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Câu hỏi mẫu (không cần AI) — chỉ dùng chính sách chung, không bịa thông số */
function ruleBased(name: string, warranty: string | null, existing: string[]): Faq[] {
  const w = warranty && warranty !== "0 tháng" ? warranty : null;
  const all: Faq[] = [
    {
      question: `${name} có được bảo hành không?`,
      answer: w
        ? `Có. Máy được bảo hành ${w}, MCBROTHER hỗ trợ kỹ thuật và có sẵn linh kiện thay thế trong suốt quá trình sử dụng.`
        : `Sản phẩm này thuộc nhóm vật tư/linh kiện tiêu hao nên không áp dụng bảo hành dài hạn. MCBROTHER vẫn hỗ trợ tư vấn và đổi mới nếu lỗi do nhà sản xuất khi nhận hàng.`,
    },
    {
      question: "MCBROTHER có giao hàng và lắp đặt tận nơi không?",
      answer:
        "Có. MCBROTHER giao hàng toàn quốc; với máy cần lắp đặt, kỹ thuật viên hỗ trợ lắp đặt và hướng dẫn vận hành tận nơi. Liên hệ để được báo chi phí vận chuyển theo địa chỉ cụ thể.",
    },
    {
      question: `Làm sao để nhận báo giá ${name}?`,
      answer: `Bạn gọi hotline ${SITE.phoneDisplay}, nhắn Zalo hoặc gửi form liên hệ trên website. Nên cho biết sản phẩm cần đóng gói và sản lượng mỗi ngày để được tư vấn đúng model.`,
    },
  ];
  const have = new Set(existing.map(norm));
  return all.filter((f) => !have.has(norm(f.question)));
}

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => ({}))) as Body;
  const name = clip(b.name, 200);
  if (!name) return NextResponse.json({ ok: false, error: "Thiếu tên sản phẩm" }, { status: 400 });
  const count = Math.min(5, Math.max(2, Number(b.count) || 3));
  const existing = (b.existing ?? []).map((q) => clip(q, 200)).filter(Boolean).slice(0, 20);
  const warranty = clip(b.warranty, 40) || null;

  const fallback = (aiError?: string) =>
    NextResponse.json({ ok: true, source: "rule", faqs: ruleBased(name, warranty, existing).slice(0, count), aiError });

  if (!aiProvider()) return fallback("no-key");
  if (!rateLimit("ai-faq", 40, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Gọi AI quá nhiều, thử lại sau ít phút." }, { status: 429 });
  }

  const data = [
    `- Tên: ${name}`,
    b.category && `- Danh mục: ${clip(b.category, 100)}`,
    b.specs && `- Thông số: ${clip(b.specs, 500)}`,
    warranty && `- Bảo hành: ${warranty === "0 tháng" ? "không bảo hành (vật tư tiêu hao)" : warranty}`,
    b.short && `- Mô tả ngắn: ${clip(stripHtml(b.short), 600)}`,
    b.content && `- Nội dung: ${clip(stripHtml(b.content), 2000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Bạn viết mục "Câu hỏi thường gặp" cho trang sản phẩm của MCBROTHER — công ty bán máy chế biến & đóng gói thực phẩm công nghiệp ở TP.HCM.

Chính sách chung của công ty (được phép dùng):
- Giao hàng toàn quốc; lắp đặt và hướng dẫn vận hành tận nơi.
- Hỗ trợ kỹ thuật trọn đời máy, có sẵn linh kiện thay thế.
- Báo giá qua hotline ${SITE.phoneDisplay}, Zalo hoặc form liên hệ trên website.

Dữ liệu sản phẩm:
${data}

Yêu cầu:
- Viết đúng ${count} câu hỏi mà khách mua máy thật sự hay hỏi về SẢN PHẨM NÀY (VD: dùng cho loại sản phẩm nào, năng suất, điện áp/công suất, vận hành có khó không, bảo hành, bảo trì, chọn model…). Ưu tiên câu hỏi trả lời được bằng dữ liệu trên.
- Câu trả lời 1–3 câu, tiếng Việt tự nhiên, chính xác. TUYỆT ĐỐI không bịa số liệu, giá tiền, thời gian giao hàng hay chứng nhận không có trong dữ liệu; nếu dữ liệu không đủ thì trả lời chung và mời khách liên hệ để được tư vấn.
- Không lặp lại các câu hỏi đã có:${existing.length ? "\n" + existing.map((q) => `  - ${q}`).join("\n") : " (chưa có)"}
- Không dùng emoji, không viết HOA toàn bộ.

Chỉ trả về JSON: {"faqs": [{"question": "...", "answer": "..."}]}`;

  try {
    const { text } = await askAI({ prompt, maxTokens: 900, temperature: 0.4, json: true });
    const j = JSON.parse(text || "{}");
    const list: any[] = Array.isArray(j.faqs) ? j.faqs : Array.isArray(j) ? j : [];
    const have = new Set(existing.map(norm));
    const faqs: Faq[] = list
      .map((f) => ({ question: clip(f?.question ?? f?.q, 200), answer: String(f?.answer ?? f?.a ?? "").trim().slice(0, 800) }))
      .filter((f) => f.question && f.answer && !have.has(norm(f.question)))
      .slice(0, count);
    if (!faqs.length) {
      console.error("AI_FAQ_EMPTY", text.slice(0, 400));
      return fallback(`AI trả về không đúng định dạng: ${text.slice(0, 100)}`);
    }
    return NextResponse.json({ ok: true, source: "ai", faqs });
  } catch (e) {
    console.error("AI_FAQ_ERROR", e);
    return fallback(String((e as any)?.message || e).slice(0, 200));
  }
}
