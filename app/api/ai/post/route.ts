// app/api/ai/post/route.ts
// AI viết trọn 1 bài blog chuẩn SEO từ 1 từ khoá: tiêu đề, slug, sapo, nội dung HTML, SEO title/description, tags.
// - Lấy dữ liệu THẬT từ web (sản phẩm liên quan + thông số, bài đã có) → không bịa thông số, có link nội bộ về sản phẩm.
// - Chèn ảnh sản phẩm thật vào bài ([[SP:slug]] → <figure>), có mục Câu hỏi thường gặp, lời kêu gọi liên hệ.
// - CHỈ trả gợi ý cho form, KHÔNG tự lưu. CHỈ admin gọi được (tốn tiền API).
import { NextResponse } from "next/server";
import { denyIfNotAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { aiProvider, askAI } from "@/lib/ai-text";
import { slugify } from "@/lib/slug";
import { cleanAiArticle, COMPANY_BRIEF, existingPosts, postCategories, relatedProducts } from "@/lib/ai-blog";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60; // viết bài dài mất 20–50 giây

const LENGTHS = { short: 800, medium: 1300, long: 1800 } as const;
const TYPES: Record<string, string> = {
  guide: "Bài hướng dẫn / kiến thức (How-to): giải thích dễ hiểu, có các bước, mẹo, lỗi thường gặp.",
  buying: "Bài tư vấn chọn mua: tiêu chí chọn, phù hợp với quy mô nào, lưu ý khi mua, gợi ý sản phẩm.",
  compare: "Bài so sánh: so sánh các loại / phương án, có bảng so sánh <table>, kết luận nên chọn gì cho ai.",
  list: "Bài dạng danh sách (Top / X cách / X lưu ý): mỗi mục 1 tiêu đề H3, ngắn gọn, thực tế.",
  application: "Bài ứng dụng theo ngành: máy dùng cho ngành / sản phẩm cụ thể nào, quy trình, hiệu quả.",
  news: "Bài tin tức / xu hướng ngành: bối cảnh, ý nghĩa với doanh nghiệp sản xuất, nên làm gì.",
};

const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  if (!rateLimit("ai-post", 15, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Gọi AI quá nhiều lần, thử lại sau ít phút." }, { status: 429 });
  }
  if (!aiProvider()) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình ANTHROPIC_API_KEY (hoặc OPENAI_API_KEY) trên Vercel." }, { status: 500 });
  }

  const b = await req.json().catch(() => ({}) as any);
  const keyword = clip(b?.keyword, 150);
  if (keyword.length < 3) return NextResponse.json({ ok: false, error: "Nhập chủ đề / từ khoá chính." }, { status: 400 });
  const extra = clip(b?.extraKeywords, 300);
  const notes = clip(b?.notes, 1200);
  const type = TYPES[b?.type] ? String(b.type) : "guide";
  const words = LENGTHS[b?.length as keyof typeof LENGTHS] ?? LENGTHS.medium;
  const postId = Number(b?.postId) || undefined;

  const [products, posts, cats] = await Promise.all([relatedProducts(`${keyword} ${extra}`), existingPosts(keyword, postId), postCategories()]);

  const prompt = `Bạn là biên tập viên SEO tiếng Việt cho website bán máy móc công nghiệp ${SITE.name}.
Viết 1 bài blog hoàn chỉnh để lên top Google và đưa khách về trang sản phẩm.

THÔNG TIN CÔNG TY: ${COMPANY_BRIEF}

TỪ KHOÁ CHÍNH: ${keyword}
${extra ? `TỪ KHOÁ PHỤ: ${extra}\n` : ""}LOẠI BÀI: ${TYPES[type]}
ĐỘ DÀI: khoảng ${words} từ (phần nội dung).
${notes ? `YÊU CẦU RIÊNG CỦA ADMIN: ${notes}\n` : ""}
SẢN PHẨM THẬT CỦA WEB (chỉ dùng thông số có ở đây, link dạng /san-pham/<slug>):
${products.length ? products.map((p) => `- slug: ${p.slug} | ${p.name} | ${p.facts}`).join("\n") : "(không có sản phẩm khớp — viết kiến thức chung, cuối bài mời liên hệ tư vấn)"}

BÀI VIẾT ĐÃ CÓ LIÊN QUAN (có thể link nội bộ dạng /tin-tuc/<slug>):
${posts.related.length ? posts.related.map((p) => `- ${p.slug} | ${p.title}`).join("\n") : "(chưa có)"}

TIÊU ĐỀ CÁC BÀI ĐÃ ĐĂNG (KHÔNG đặt tiêu đề trùng hoặc gần giống):
${posts.titles.slice(0, 60).map((t) => `- ${t}`).join("\n") || "(chưa có)"}

CHUYÊN MỤC BLOG (chọn 1 id phù hợp nhất, không hợp thì null):
${cats.map((c) => `${c.id}: ${c.name}`).join("\n") || "(không có)"}

QUY TẮC NỘI DUNG:
- Đúng ý định tìm kiếm của người gõ từ khoá. Đoạn mở đầu 2–3 câu trả lời thẳng vấn đề, có từ khoá chính.
- Từ khoá chính xuất hiện tự nhiên ở đoạn đầu, ít nhất 1 thẻ <h2> và phần kết. Không nhồi từ khoá.
- Dùng <h2> cho mục lớn, <h3> cho mục nhỏ; có <ul>/<ol>; câu ngắn, dễ đọc cho chủ xưởng / doanh nghiệp nhỏ.
- KHÔNG bịa số liệu, giá, chứng nhận, tên khách hàng, thống kê. Thông số chỉ lấy từ danh sách sản phẩm ở trên; không chắc thì nói chung chung.
- Link nội bộ: 2–5 link tự nhiên tới sản phẩm (/san-pham/<slug>) và bài liên quan (/tin-tuc/<slug>) — chỉ dùng slug có trong danh sách. Không link ra web khác.
- Chèn tối đa 3 ảnh sản phẩm bằng cách viết đúng 1 dòng riêng: [[SP:<slug>]] (đặt sau đoạn nói về sản phẩm đó).
- Có mục <h2>Câu hỏi thường gặp</h2> với 3–5 câu hỏi dạng <h3>, trả lời ngắn.
- Kết bài: tóm tắt + mời liên hệ ${SITE.name}, hotline/Zalo ${SITE.phoneDisplay}, link <a href="/lien-he">liên hệ</a>.
- HTML sạch: chỉ dùng p, h2, h3, ul, ol, li, strong, em, a, table, thead, tbody, tr, th, td, blockquote. Không <h1>, không style/class, không markdown.

TRẢ VỀ ĐÚNG 2 PHẦN, KHÔNG THÊM GÌ KHÁC:
<meta>
{"title":"tiêu đề bài 50–65 ký tự, có từ khoá, hấp dẫn","excerpt":"sapo 140–200 ký tự","metaTitle":"≤ 60 ký tự, có từ khoá","metaDescription":"140–160 ký tự, có từ khoá và lời mời","tags":["3–6 thẻ ngắn, chữ thường"],"categoryId":<số hoặc null>}
</meta>
<article>
...nội dung HTML...
</article>`;

  let text: string;
  try {
    ({ text } = await askAI({ prompt, maxTokens: Math.round(words * 2.6) + 900, temperature: 0.7 }));
  } catch (e: any) {
    console.error("AI_POST_ERROR", e);
    return NextResponse.json({ ok: false, error: `AI lỗi: ${String(e?.message || e).slice(0, 200)}` }, { status: 502 });
  }

  // ----- tách 2 phần -----
  const metaRaw = text.match(/<meta>([\s\S]*?)<\/meta>/i)?.[1] ?? "";
  let meta: any = {};
  try {
    const a = metaRaw.indexOf("{");
    const z = metaRaw.lastIndexOf("}");
    meta = JSON.parse(metaRaw.slice(a, z + 1));
  } catch {
    meta = {};
  }
  let html = text.match(/<article>([\s\S]*?)(<\/article>|$)/i)?.[1] ?? text.replace(/<meta>[\s\S]*?<\/meta>/i, "");
  if (html.replace(/<[^>]+>/g, "").trim().length < 200) {
    return NextResponse.json({ ok: false, error: "AI trả bài quá ngắn hoặc sai định dạng, bấm viết lại." }, { status: 502 });
  }

  // ----- làm sạch & kiểm link -----
  html = cleanAiArticle(html, products, posts.related.map((p) => p.slug));

  const title = clip(meta.title, 150) || keyword;
  const catId = cats.some((c) => c.id === Number(meta.categoryId)) ? Number(meta.categoryId) : null;
  const tags = Array.isArray(meta.tags)
    ? [...new Set(meta.tags.map((t: unknown) => clip(t, 40).toLowerCase()).filter(Boolean))].slice(0, 8)
    : [];

  return NextResponse.json({
    ok: true,
    post: {
      title,
      slug: slugify(title),
      excerpt: clip(meta.excerpt, 300),
      metaTitle: clip(meta.metaTitle, 70),
      metaDescription: clip(meta.metaDescription, 170),
      tags,
      categoryId: catId,
      content: html,
    },
    usedProducts: products.map((p) => ({ slug: p.slug, name: p.name })),
  });
}
