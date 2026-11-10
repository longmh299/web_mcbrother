// app/api/ai/post-ideas/route.ts
// Gợi ý 10 chủ đề blog kéo traffic: dựa trên danh mục & sản phẩm THẬT của web, tránh trùng bài đã đăng
// và tránh lặp lại những gợi ý đã đưa trước đó.
//
// Vì sao phải "xáo" đầu vào: model Claude mới không nhận tham số temperature → cùng 1 câu lệnh sẽ trả
// gần như cùng 1 kết quả. Nên mỗi lần gọi ta chọn ngẫu nhiên vài danh mục, vài sản phẩm, vài góc viết
// và vài ngành khách hàng khác nhau → mỗi lượt ra 1 bộ chủ đề khác.
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

/** Góc viết — mỗi lượt lấy ngẫu nhiên 3 góc */
const ANGLES = [
  "giải quyết 1 vấn đề cụ thể khi sản xuất (năng suất thấp, hao hụt, đóng gói không đều, hở mí, ẩm mốc…)",
  "lỗi thường gặp của máy và cách khắc phục",
  "chi phí đầu tư, giá máy, thời gian hoàn vốn, chọn máy theo ngân sách",
  "so sánh: thủ công vs bán tự động vs tự động, hoặc 2 loại máy / 2 công nghệ",
  "quy trình sản xuất từng bước cho 1 sản phẩm cụ thể",
  "bảo trì, vệ sinh, an toàn thực phẩm khi vận hành máy",
  "tiêu chuẩn & giấy tờ: HACCP, ISO 22000, ghi nhãn, in hạn sử dụng, mã vạch",
  "mở xưởng nhỏ / khởi nghiệp: cần những máy gì, bố trí dây chuyền",
  "bao bì & chất liệu túi: chọn túi, màng, hũ, chai phù hợp với máy",
  "đóng gói để bán online / sàn TMĐT / xuất khẩu",
  "nâng cấp từ làm tay lên máy: dấu hiệu cần đầu tư, tính toán sản lượng",
  "kinh nghiệm chọn nhà cung cấp, bảo hành, lắp đặt, hướng dẫn vận hành",
];

/** Ngành khách hàng — mỗi lượt lấy ngẫu nhiên 4 ngành để AI nghĩ ví dụ thực tế */
const INDUSTRIES = [
  "cà phê", "trà", "bánh kẹo", "hạt điều & hạt dinh dưỡng", "trái cây sấy", "nước mắm & nước chấm", "gia vị",
  "mỹ phẩm", "dược liệu & thực phẩm chức năng", "thức ăn chăn nuôi", "gạo & nông sản", "thịt & thuỷ hải sản đông lạnh",
  "nước giải khát", "sữa & sữa chua", "bột & ngũ cốc", "hoá chất tẩy rửa", "phân bón", "đồ ăn vặt", "bún phở khô", "mật ong",
];

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bỏ dấu, chữ thường, tách từ (≥ 2 ký tự) — để so độ giống nhau giữa các tiêu đề */
function tokens(s: string) {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2)
  );
}
function similar(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

export async function POST(req: Request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  if (!rateLimit("ai-post-ideas", 30, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Gọi AI quá nhiều lần, thử lại sau ít phút." }, { status: 429 });
  }
  if (!aiProvider()) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình ANTHROPIC_API_KEY (hoặc OPENAI_API_KEY) trên Vercel." }, { status: 500 });
  }
  const b = await req.json().catch(() => ({}) as any);
  const focus = clip(b?.focus, 150);
  // những gợi ý đã hiện cho admin trước đó (trình duyệt gửi lên) → không lặp lại
  const shown: string[] = (Array.isArray(b?.exclude) ? b.exclude : []).map((x: unknown) => clip(x, 160)).filter(Boolean).slice(0, 80);

  const [cats, products, posts] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, _count: { select: { products: true } } } }),
    prisma.product.findMany({ where: { published: true }, select: { name: true, categoryId: true }, take: 2000 }),
    prisma.post.findMany({ select: { title: true }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  // ----- xáo đầu vào cho mỗi lượt -----
  const withProducts = cats.filter((c) => c._count.products > 0);
  const pickedCats = focus ? [] : shuffle(withProducts.length ? withProducts : cats).slice(0, 4);
  const pickedIds = new Set(pickedCats.map((c) => c.id));
  const pool = focus ? products : products.filter((p) => p.categoryId != null && pickedIds.has(p.categoryId));
  const pickedProducts = shuffle(pool.length ? pool : products).slice(0, 30);
  const angles = shuffle(ANGLES).slice(0, 3);
  const industries = shuffle(INDUSTRIES).slice(0, 4);

  const avoid = [...posts.map((p) => p.title), ...shown];

  const prompt = `Bạn là chuyên gia SEO content cho website bán máy chế biến & đóng gói ${SITE.name} (khách hàng: xưởng sản xuất, doanh nghiệp vừa và nhỏ ở Việt Nam).
Đề xuất 10 chủ đề bài blog MỚI để kéo khách tìm kiếm trên Google về web, ưu tiên từ khoá dài (long-tail), ít cạnh tranh, có ý định mua hoặc tìm giải pháp.
${focus ? `TẬP TRUNG VÀO: ${focus}\n` : `LƯỢT NÀY TẬP TRUNG VÀO CÁC DANH MỤC: ${pickedCats.map((c) => c.name).join(", ")}\n`}
GÓC VIẾT NÊN DÙNG LƯỢT NÀY: ${angles.join(" | ")}
NGÀNH KHÁCH HÀNG ĐỂ LẤY VÍ DỤ: ${industries.join(", ")}
TẤT CẢ DANH MỤC CỦA WEB: ${cats.map((c) => c.name).join(", ")}
SẢN PHẨM LIÊN QUAN: ${pickedProducts.map((p) => p.name).join("; ") || "(không có)"}

KHÔNG đề xuất chủ đề trùng hoặc gần giống bất kỳ tiêu đề nào dưới đây (bài đã đăng + gợi ý đã đưa trước đó):
${avoid.map((t) => `- ${t}`).join("\n") || "(chưa có)"}

YÊU CẦU ĐA DẠNG: 10 chủ đề phải khác nhau rõ về từ khoá chính và ý định tìm kiếm; trải đều các góc viết và loại bài; không quá 3 chủ đề cho cùng 1 loại máy.

Mỗi chủ đề gồm:
- "keyword": từ khoá chính người dùng hay gõ (chữ thường, 3–7 từ)
- "title": tiêu đề bài gợi ý
- "type": 1 trong guide | buying | compare | list | application | news
- "why": 1 câu ngắn vì sao chủ đề này kéo được khách
Trả JSON: {"ideas":[{"keyword":"...","title":"...","type":"...","why":"..."}]}`;

  try {
    const { text } = await askAI({ prompt, maxTokens: 2000, temperature: 1, json: true });
    const j = JSON.parse(text);

    // lọc lần nữa phía server: AI vẫn có thể lặp → bỏ ý quá giống bài đã có / gợi ý cũ / ý khác trong cùng lượt
    const seen = avoid.map(tokens);
    const ideas: Array<{ keyword: string; title: string; type: string; why: string }> = [];
    for (const x of Array.isArray(j?.ideas) ? j.ideas : []) {
      const idea = {
        keyword: clip(x?.keyword, 120),
        title: clip(x?.title, 160),
        type: TYPES.has(x?.type) ? x.type : "guide",
        why: clip(x?.why, 200),
      };
      if (!idea.keyword || !idea.title) continue;
      const tk = tokens(idea.keyword);
      const tt = tokens(idea.title);
      if (seen.some((s) => similar(tk, s) >= 0.85 || similar(tt, s) >= 0.7)) continue;
      ideas.push(idea);
      seen.push(tk, tt);
      if (ideas.length >= 12) break;
    }
    if (!ideas.length) throw new Error("AI chỉ ra chủ đề trùng với bài cũ — bấm Gợi ý khác hoặc nhập trọng tâm");
    return NextResponse.json({ ok: true, ideas, focusCats: focus ? [] : pickedCats.map((c) => c.name) });
  } catch (e: any) {
    console.error("AI_POST_IDEAS_ERROR", e);
    return NextResponse.json({ ok: false, error: `AI lỗi: ${String(e?.message || e).slice(0, 200)}` }, { status: 502 });
  }
}
