// lib/seo-audit.ts
// Chấm điểm SEO cho sản phẩm / bài viết: tính đúng tiêu đề & mô tả mà Google THỰC SỰ thấy
// (giống generateMetadata ở trang sản phẩm / bài viết), rồi liệt kê lỗi cần sửa.

export type SeoKind = "product" | "post";
export type IssueLevel = "error" | "warn" | "info";

export type IssueCode =
  | "title_missing"
  | "title_long"
  | "title_short"
  | "title_dup"
  | "desc_missing"
  | "desc_long"
  | "desc_short"
  | "desc_dup"
  | "short_missing"
  | "content_thin"
  | "no_image"
  | "no_category"
  | "no_faq"
  | "noindex";

export const ISSUE_LABEL: Record<IssueCode, string> = {
  title_missing: "Chưa có tiêu đề SEO",
  title_long: "Tiêu đề quá dài",
  title_short: "Tiêu đề quá ngắn",
  title_dup: "Tiêu đề trùng",
  desc_missing: "Chưa có mô tả SEO",
  desc_long: "Mô tả quá dài",
  desc_short: "Mô tả quá ngắn",
  desc_dup: "Mô tả trùng",
  short_missing: "Thiếu mô tả ngắn",
  content_thin: "Nội dung mỏng",
  no_image: "Thiếu ảnh đại diện",
  no_category: "Chưa có danh mục",
  no_faq: "Chưa có FAQ",
  noindex: "Đang ẩn khỏi Google",
};

/** Mức trừ điểm cho từng lỗi */
const PENALTY: Record<IssueCode, number> = {
  title_missing: 3,
  title_long: 12,
  title_short: 8,
  title_dup: 20,
  desc_missing: 8,
  desc_long: 6,
  desc_short: 10,
  desc_dup: 15,
  short_missing: 8,
  content_thin: 15,
  no_image: 15,
  no_category: 5,
  no_faq: 3,
  noindex: 30,
};

const LEVEL: Record<IssueCode, IssueLevel> = {
  title_missing: "info",
  title_long: "error",
  title_short: "warn",
  title_dup: "error",
  desc_missing: "warn",
  desc_long: "warn",
  desc_short: "warn",
  desc_dup: "error",
  short_missing: "warn",
  content_thin: "warn",
  no_image: "error",
  no_category: "warn",
  no_faq: "info",
  noindex: "error",
};

export type SeoInput = {
  id: number;
  kind: SeoKind;
  name: string; // tên SP / tiêu đề bài
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  short: string | null; // mô tả ngắn SP / sapo bài viết
  content: string | null; // HTML nội dung chi tiết
  coverImage: string | null;
  categoryName: string | null;
  faqCount: number;
  noindex: boolean;
};

export type SeoIssue = { code: IssueCode; level: IssueLevel; detail: string };
export type SeoResult = {
  score: number;
  /** Tiêu đề Google hiển thị (đã gắn " | MCBROTHER" như trang thật) */
  googleTitle: string;
  /** Mô tả Google hiển thị */
  googleDesc: string;
  issues: SeoIssue[];
};

export const TITLE_MAX = 60;
export const TITLE_MIN = 30;
export const DESC_MIN = 120;
export const DESC_MAX = 160;

// ✅ Trình soạn thảo lưu chữ có dấu dạng "D&acirc;y m&aacute;y" -> phải GIẢI MÃ, không được xoá (xoá thì thành "D y m y")
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", bull: "•", middot: "·",
  deg: "°", plusmn: "±", times: "×", divide: "÷", sup2: "²", sup3: "³", micro: "µ", copy: "©", reg: "®", trade: "™",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Egrave: "È", Eacute: "É", Ecirc: "Ê", Igrave: "Ì", Iacute: "Í",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ugrave: "Ù", Uacute: "Ú", Yacute: "Ý",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", egrave: "è", eacute: "é", ecirc: "ê", igrave: "ì", iacute: "í",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ugrave: "ù", uacute: "ú", yacute: "ý",
};
export const decodeEntities = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return NAMED[e] ?? " ";
  });

export const stripHtml = (html: string | null | undefined) =>
  decodeEntities((html ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Giống lib/seo.ts: brandTitle() + template "%s | MCBROTHER" */
export function googleTitleOf(title: string) {
  return /mcbrother/i.test(title) ? title : `${title} | MCBROTHER`;
}

/** Giống metaDescription() ở lib/seo.ts: bỏ HTML, cắt ~160 ký tự */
function googleDescOf(i: SeoInput) {
  const raw = stripHtml(i.metaDescription || i.short || i.content);
  if (!raw) return "";
  return raw.length <= DESC_MAX ? raw : raw.slice(0, DESC_MAX - 1).replace(/\s+\S*$/, "") + "…";
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Chấm điểm cả danh sách (cần cả danh sách để phát hiện tiêu đề / mô tả trùng nhau) */
export function auditAll(items: SeoInput[]): Map<number, SeoResult> {
  const titleCount = new Map<string, number>();
  const descCount = new Map<string, number>();
  const pre = items.map((i) => {
    const t = googleTitleOf((i.metaTitle || i.name).trim());
    const d = googleDescOf(i);
    titleCount.set(norm(t), (titleCount.get(norm(t)) ?? 0) + 1);
    if (d) descCount.set(norm(d), (descCount.get(norm(d)) ?? 0) + 1);
    return { i, t, d };
  });

  const out = new Map<number, SeoResult>();
  for (const { i, t, d } of pre) {
    const issues: SeoIssue[] = [];
    const add = (code: IssueCode, detail: string) => issues.push({ code, level: LEVEL[code], detail });

    // ---- Tiêu đề ----
    if (!i.metaTitle?.trim()) add("title_missing", `Đang dùng tên ${i.kind === "product" ? "sản phẩm" : "bài"} làm tiêu đề`);
    if (t.length > TITLE_MAX) add("title_long", `${t.length} ký tự — Google cắt sau ~${TITLE_MAX}`);
    else if (t.length < TITLE_MIN) add("title_short", `${t.length} ký tự — nên ${TITLE_MIN}–${TITLE_MAX}`);
    if ((titleCount.get(norm(t)) ?? 0) > 1) add("title_dup", `${titleCount.get(norm(t))} trang cùng tiêu đề`);

    // ---- Mô tả ----
    if (!i.metaDescription?.trim()) {
      add("desc_missing", d ? "Google đang tự lấy từ mô tả ngắn / nội dung" : "Google không có gì để hiển thị");
    }
    if (d && d.length < DESC_MIN) add("desc_short", `${d.length} ký tự — nên ${DESC_MIN}–${DESC_MAX}`);
    if (i.metaDescription && i.metaDescription.trim().length > DESC_MAX)
      add("desc_long", `${i.metaDescription.trim().length} ký tự — Google cắt sau ~${DESC_MAX}`);
    if (d && (descCount.get(norm(d)) ?? 0) > 1) add("desc_dup", `${descCount.get(norm(d))} trang cùng mô tả`);

    // ---- Nội dung ----
    if (!i.short?.trim()) add("short_missing", i.kind === "product" ? "Khách không thấy tóm tắt cạnh ảnh" : "Thiếu sapo dưới tiêu đề");
    const words = stripHtml(i.content).split(" ").filter(Boolean).length;
    const minWords = i.kind === "product" ? 150 : 500;
    if (words < minWords) add("content_thin", `${words} từ — nên từ ${minWords} từ`);
    if (!i.coverImage) add("no_image", "Không có ảnh khi hiển thị & chia sẻ");
    if (!i.categoryName) add("no_category", "Không nằm trong danh mục nào");
    if (i.kind === "product" && i.faqCount === 0) add("no_faq", "Thêm 2–3 câu hỏi thường gặp");
    if (i.noindex) add("noindex", "Đang bật noindex");

    const score = Math.max(0, 100 - issues.reduce((s, x) => s + PENALTY[x.code], 0));
    out.set(i.id, { score, googleTitle: t, googleDesc: d, issues });
  }
  return out;
}

export const scoreTone = (s: number) =>
  s >= 85 ? "bg-emerald-100 text-emerald-700" : s >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";