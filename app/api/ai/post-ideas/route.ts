// app/api/ai/post-ideas/route.ts
// Gợi ý 10 chủ đề blog kéo traffic: dựa trên danh mục & sản phẩm THẬT của web, tránh trùng bài đã đăng.
// CHỈ admin gọi được.
import { NextResponse } from "next/server";
import { denyIfNotAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { aiProvider, askAI } from "@/lib/ai-text";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const TYPES = new Set(["guide", "buying", "compare", "list", "application", "news"]);

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  if (!rateLimit("ai-post-ideas", 20, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Gọi AI quá nhiều lần, thử lại sau ít phút." }, { status: 429 });
  }
  if (!aiProvider()) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình ANTHROPIC_API_KEY (hoặc OPENAI_API_KEY) trên Vercel." }, { status: 500 });
  }
  const b = await req.json().catch(() => ({}) as any);
  const focus = clip(b?.focus, 150);

  const [cats, products, posts] = await Promise.all([
    prisma.category.findMany({ select: { name: true, _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { published: true },
      select: { name: true },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 60,
    }),
    prisma.post.findMany({ select: { title: true }, orderBy: { createdAt: "desc" }, take: 120 }),
  ]);

  const prompt = `Bạn là chuyên gia SEO content cho website bán máy chế biến & đóng gói ${SITE.name} (khách hàng: xưởng sản xuất, doanh nghiệp thực phẩm, mỹ phẩm, hoá chất… ở Việt Nam).
Đề xuất 10 chủ đề bài blog MỚI để kéo khách tìm kiếm trên Google về web, ưu tiên từ khoá có ý định mua hoặc tìm giải pháp (long-tail, ít cạnh tranh).
${focus ? `Tập trung vào: ${focus}\n` : ""}
DANH MỤC SẢN PHẨM: ${cats.map((c) => `${c.name} (${c._count.products})`).join(", ")}
MỘT SỐ SẢN PHẨM: ${products.map((p) => p.name).join("; ")}
BÀI ĐÃ ĐĂNG (KHÔNG đề xuất trùng hoặc gần giống): ${posts.map((p) => p.title).join(" | ") || "(chưa có)"}

Mỗi chủ đề gồm:
- "keyword": từ khoá chính người dùng hay gõ (chữ thường, 3–7 từ)
- "title": tiêu đề bài gợi ý
- "type": 1 trong guide | buying | compare | list | application | news
- "why": 1 câu ngắn vì sao chủ đề này kéo được khách
Trả JSON: {"ideas":[{"keyword":"...","title":"...","type":"...","why":"..."}]}`;

  try {
    const { text } = await askAI({ prompt, maxTokens: 1500, temperature: 0.8, json: true });
    const j = JSON.parse(text);
    const ideas = (Array.isArray(j?.ideas) ? j.ideas : [])
      .map((x: any) => ({
        keyword: clip(x?.keyword, 120),
        title: clip(x?.title, 160),
        type: TYPES.has(x?.type) ? x.type : "guide",
        why: clip(x?.why, 200),
      }))
      .filter((x: any) => x.keyword && x.title)
      .slice(0, 12);
    if (!ideas.length) throw new Error("AI không trả gợi ý");
    return NextResponse.json({ ok: true, ideas });
  } catch (e: any) {
    console.error("AI_POST_IDEAS_ERROR", e);
    return NextResponse.json({ ok: false, error: `AI lỗi: ${String(e?.message || e).slice(0, 200)}` }, { status: 502 });
  }
}
