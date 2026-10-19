// lib/ai-text.ts — ✅ MỚI: gọi AI sinh chữ, dùng chung cho các route /api/ai/*
//   Có ANTHROPIC_API_KEY -> dùng Claude (mặc định claude-haiku-5-5, đổi bằng ANTHROPIC_MODEL)
//   Không có -> dùng OpenAI như cũ (OPENAI_API_KEY, gpt-4o-mini)
//   Không có key nào -> aiProvider() trả null
// CHỈ chạy phía server (key nằm trong biến môi trường, không lộ ra trình duyệt).

export type AiProvider = "claude" | "openai";

export function aiProvider(): AiProvider | null {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "claude";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return null;
}

export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/** Gửi 1 câu lệnh, trả về chữ AI viết. json=true -> yêu cầu AI chỉ trả JSON. */
export async function askAI(opts: { prompt: string; maxTokens: number; temperature?: number; json?: boolean }): Promise<{ text: string; provider: AiProvider }> {
  const provider = aiProvider();
  if (!provider) throw new AiError("no-key", 500);
  const temperature = opts.temperature ?? 0.5;

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5",
        // ✅ model Claude mới có thể "suy nghĩ" trước khi viết, phần đó cũng tính vào max_tokens
        //    -> cho dư (chỉ trả tiền phần thật sự dùng), tránh hết lượt trước khi kịp viết câu trả lời
        max_tokens: Math.max(opts.maxTokens * 4, 2048),
        // ✅ không gửi temperature: các model Claude mới báo lỗi 400 "temperature is deprecated"
        ...(opts.json ? { system: "Chỉ trả về đúng 1 đối tượng JSON hợp lệ, không thêm chữ nào khác, không bọc trong ```." } : {}),
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) throw new AiError(`Claude ${res.status}: ${String(data?.error?.message || "lỗi").slice(0, 160)}`);
    const text = (data?.content || []).filter((c: any) => c?.type === "text").map((c: any) => c.text).join("");
    if (!text.trim()) {
      const kinds = (data?.content || []).map((c: any) => c?.type).join(",") || "không có";
      throw new AiError(`Claude không trả chữ (stop_reason: ${data?.stop_reason}, nội dung: ${kinds})`);
    }
    return { text: opts.json ? extractJson(text) : text, provider };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: opts.prompt }],
      temperature,
      max_tokens: opts.maxTokens,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new AiError(`OpenAI ${res.status}: ${String(data?.error?.message || "lỗi").slice(0, 160)}`);
  return { text: String(data?.choices?.[0]?.message?.content || ""), provider };
}

/** Lấy đoạn {...} trong câu trả lời (phòng khi AI vẫn bọc ```json hoặc thêm chữ) */
function extractJson(t: string) {
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  return a >= 0 && b > a ? t.slice(a, b + 1) : "{}";
}