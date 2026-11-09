// lib/track-filter.ts
// Bộ lọc dùng chung cho /api/track (lượt bấm) và /api/pageview (lượt truy cập):
//  - Bot: Googlebot và mọi crawler của Google, Bing, Facebook, Zalo, công cụ SEO…
//  - IP loại trừ: mạng công ty / wifi nhà (quản lý ở Admin > Lượt truy cập, hoặc biến môi trường TRACK_EXCLUDE_IPS)
import { prisma } from "@/lib/prisma";

/**
 * User-Agent của bot. Google có rất nhiều crawler không chứa chữ "bot"
 * (Google-InspectionTool, GoogleOther, Mediapartners-Google, APIs-Google, FeedFetcher-Google,
 * Google-Read-Aloud, Chrome-Lighthouse / PageSpeed…), nên liệt kê riêng.
 */
const BOT_UA = new RegExp(
  [
    "bot", "crawl", "spider", "slurp", "scrap", "fetch", "preview", "headless", "lighthouse",
    "google", // Googlebot, Google-InspectionTool, GoogleOther, AdsBot-Google, Mediapartners-Google, APIs-Google, Storebot-Google…
    "facebookexternalhit", "facebot", "zalo.?(link|preview)", "bingpreview", "yandex", "baidu", "ahrefs", "semrush",
    "mj12", "dotbot", "petalbot", "bytespider", "gptbot", "claudebot", "ccbot", "applebot", "duckduck",
    "pagespeed", "gtmetrix", "pingdom", "uptime", "monitor", "python-requests", "curl", "wget", "axios", "node-fetch",
    "go-http", "java/", "okhttp", "phantomjs", "puppeteer", "playwright", "selenium",
  ].join("|"),
  "i"
);

/** Trình duyệt thật luôn có "Mozilla/" trong User-Agent; app Google (GSA) trên điện thoại vẫn là người thật. */
export function isBotUA(ua: string) {
  if (!ua || ua.length < 20 || !/mozilla\//i.test(ua)) return true;
  // App Google trên iPhone/Android (người dùng thật) có chuỗi "GSA/" → không phải bot
  const cleaned = ua.replace(/\bGSA\/[\d.]+/g, "");
  return BOT_UA.test(cleaned);
}

// ---------- IP loại trừ ----------
let cache: { at: number; list: string[] } = { at: 0, list: [] };
const CACHE_MS = 60_000;

/** Danh sách IP loại trừ (DB + biến môi trường), cache 60 giây */
export async function getExcludedIps(): Promise<string[]> {
  const now = Date.now();
  if (now - cache.at < CACHE_MS) return cache.list;
  const fromEnv = (process.env.TRACK_EXCLUDE_IPS || "").split(/[,\s]+/).filter(Boolean);
  const fromDb = await prisma.excludedIp
    .findMany({ select: { ip: true } })
    .then((r: { ip: string }[]) => r.map((x) => x.ip))
    .catch(() => [] as string[]);
  cache = { at: now, list: [...new Set([...fromEnv, ...fromDb].map(normIp))] };
  return cache.list;
}

/** Xoá cache sau khi admin thêm/xoá IP */
export function clearExcludedIpCache() {
  cache = { at: 0, list: [] };
}

export function normIp(ip: string) {
  return ip.trim().toLowerCase().replace(/^::ffff:/, "");
}

/** IPv6 dạng đầy đủ 8 nhóm, bỏ số 0 ở đầu mỗi nhóm (để so sánh tiền tố chính xác) */
function expandV6(ip: string) {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const full = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return full.map((g) => g.replace(/^0+(?=.)/, "")).join(":");
}

/** So khớp IP với 1 mục: khớp chính xác, hoặc tiền tố nếu mục kết thúc bằng * */
export function ipMatches(ip: string, rule: string) {
  const a = expandV6(normIp(ip));
  const r = normIp(rule);
  if (!a || !r) return false;
  if (r.endsWith("*")) {
    const pre = r.slice(0, -1);
    return a.startsWith(pre.includes(":") ? pre.split(":").map((g) => g.replace(/^0+(?=.)/, "")).join(":") : pre);
  }
  return a === expandV6(r);
}

export async function isExcludedIp(ip: string) {
  if (!ip || ip === "unknown") return false;
  const list = await getExcludedIps();
  return list.some((r) => ipMatches(ip, r));
}

/** Gợi ý tiền tố mạng: IPv6 → 4 nhóm đầu (/64, cả mạng nhà/công ty); IPv4 → giữ nguyên */
export function networkPrefix(ip: string) {
  const a = normIp(ip);
  if (a.includes(":")) return expandV6(a).split(":").slice(0, 4).join(":") + ":*";
  return a;
}
