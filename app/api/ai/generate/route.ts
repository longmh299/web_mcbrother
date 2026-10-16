// app/api/ai/generate/route.ts
// Sinh bài viết bằng OpenAI. CHỈ admin được gọi (route này tốn tiền API).
import { NextResponse } from "next/server";
import { denyIfNotAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_TITLE = 200;

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  // Chặn bấm liên tục / vòng lặp lỗi: tối đa 20 lần mỗi 10 phút
  if (!rateLimit("ai-generate", 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Gọi AI quá nhiều lần, vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình OPENAI_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({} as any));
  const title = String(body?.title ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, MAX_TITLE);

  if (!title) {
    return NextResponse.json({ ok: false, error: "Thiếu chủ đề (title)" }, { status: 400 });
  }

  const prompt = `
Bạn là chuyên gia SEO content.

Viết bài bằng tiếng Việt, HTML sạch.

YÊU CẦU:
- Không dùng style=""
- Dùng <h2> cho mỗi section
- Có đoạn tóm tắt đầu bài
- Có list bullet
- Có kết luận

FORMAT CHÍNH XÁC:

<div class="ai-summary">
Tóm tắt ngắn 2-3 câu
</div>

<h2>Giới thiệu</h2>
<p>...</p>

<h2>Ưu điểm</h2>
<ul>
<li>...</li>
</ul>

<h2>Kết luận</h2>
<p>...</p>

Chủ đề: ${title}
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000, // giới hạn chi phí mỗi lần gọi
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("OPENAI_ERROR", res.status, data?.error?.message);
      return NextResponse.json({ ok: false, error: "AI tạm thời lỗi, thử lại sau." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      content: data?.choices?.[0]?.message?.content || "",
    });
  } catch (e) {
    console.error("AI_GENERATE_ERROR", e);
    return NextResponse.json({ ok: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}