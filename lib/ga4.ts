// lib/ga4.ts
// Đọc số liệu Google Analytics 4 (GA4 Data API) bằng tài khoản dịch vụ (service account).
// Không cần thêm thư viện: tự ký JWT bằng `jose` rồi gọi REST API.
//
// Biến môi trường (giống web quản lý kho):
//   GA4_PROPERTY_ID=123456789          ← GA > Quản trị > Chi tiết tài sản (dãy số, KHÔNG phải G-XXXX)
//   GA4_CREDENTIALS_JSON={...}         ← dán nguyên file JSON của tài khoản dịch vụ (hoặc bản mã hoá base64)
// Tuỳ chọn:
//   GA_HOSTNAMES=mcbrother.com.vn,www.mcbrother.com.vn   ← chỉ tính lượt có tên miền này (loại spam "ghost")
import { importPKCS8, SignJWT } from "jose";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://analyticsdata.googleapis.com/v1beta";

export class GaConfigError extends Error {}

function parseJson(raw: string) {
  let t = raw.trim();
  if (/^'.*'$/s.test(t)) t = t.slice(1, -1); // bọc nháy đơn trong .env
  if (!t.startsWith("{")) {
    // có thể là base64
    try {
      const d = Buffer.from(t, "base64").toString("utf8").trim();
      if (d.startsWith("{")) t = d;
    } catch {}
  }
  return JSON.parse(t);
}

function readCreds() {
  let email = "";
  let key = "";
  const json = process.env.GA4_CREDENTIALS_JSON;
  if (json) {
    try {
      const j = parseJson(json);
      email = j.client_email || "";
      key = j.private_key || "";
    } catch {
      throw new GaConfigError("GA4_CREDENTIALS_JSON không phải JSON hợp lệ (dán nguyên nội dung file .json của tài khoản dịch vụ)");
    }
  }
  // Vercel/.env hay lưu xuống dòng thành "\n" dạng chữ
  key = key.trim().replace(/\\n/g, "\n");
  const propertyId = (process.env.GA4_PROPERTY_ID || "").replace(/^properties\//, "").trim();
  const missing = [
    !propertyId && "GA4_PROPERTY_ID",
    (!email || !key) && "GA4_CREDENTIALS_JSON",
  ].filter(Boolean) as string[];
  return { email, key, propertyId, missing };
}

export function gaConfigured() {
  try {
    return readCreds().missing.length === 0;
  } catch {
    return true; // biến có nhưng sai định dạng → để lỗi hiện ra khi gọi báo cáo
  }
}

export function gaMissingEnv() {
  try {
    return readCreds().missing;
  } catch {
    return [];
  }
}

let token: { value: string; exp: number } | null = null;

async function getToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const { email, key, missing } = readCreds();
  if (missing.length) throw new GaConfigError(`Thiếu biến môi trường: ${missing.join(", ")}`);
  let pk;
  try {
    pk = await importPKCS8(key, "RS256");
  } catch {
    throw new GaConfigError("private_key trong GA4_CREDENTIALS_JSON sai định dạng");
  }
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(pk);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error(`Google từ chối đăng nhập: ${j.error_description || j.error || res.status}`);
  token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.value;
}

// ---------- cache kết quả 5 phút (GA có hạn mức gọi API mỗi ngày) ----------
const cache = new Map<string, { at: number; data: any }>();
const CACHE_MS = 5 * 60_000;

async function call(method: string, body: unknown, ttl = CACHE_MS) {
  const { propertyId } = readCreds();
  const k = method + JSON.stringify(body);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < ttl) return hit.data;

  const res = await fetch(`${API}/properties/${propertyId}:${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = j?.error?.message || `HTTP ${res.status}`;
    if (res.status === 403) throw new Error(`Tài khoản dịch vụ chưa được cấp quyền xem GA4 (thêm email vào GA > Quản trị > Quản lý quyền truy cập, vai trò Người xem). Chi tiết: ${msg}`);
    throw new Error(`GA4 lỗi: ${msg}`);
  }
  if (cache.size > 200) cache.clear();
  cache.set(k, { at: Date.now(), data: j });
  return j;
}

// ---------- kiểu dữ liệu gọn ----------
export type GaRequest = {
  dateRanges?: { startDate: string; endDate: string; name?: string }[];
  dimensions?: string[];
  metrics: string[];
  orderBy?: { metric?: string; dimension?: string; desc?: boolean };
  limit?: number;
  /** false = không lọc theo tên miền (mặc định có lọc) */
  hostFilter?: boolean;
};

export type GaRow = { dims: string[]; mets: number[] };

/** Chỉ tính lượt truy cập vào đúng tên miền của web (loại spam giả mạo gửi thẳng vào GA) */
function hostnameFilter() {
  const list = (process.env.GA_HOSTNAMES || "")
    .split(/[,\s]+/)
    .filter(Boolean);
  if (!list.length) {
    try {
      const h = new URL(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://mcbrother.com.vn").hostname.replace(/^www\./, "");
      if (h && h !== "localhost") list.push(h, `www.${h}`);
    } catch {}
  }
  if (!list.length) return undefined;
  return { filter: { fieldName: "hostName", inListFilter: { values: list } } };
}

function toApi(r: GaRequest) {
  const body: any = {
    dateRanges: r.dateRanges,
    dimensions: r.dimensions?.map((name) => ({ name })),
    metrics: r.metrics.map((name) => ({ name })),
    limit: r.limit,
    keepEmptyRows: false,
  };
  if (r.orderBy)
    body.orderBys = [
      r.orderBy.metric
        ? { metric: { metricName: r.orderBy.metric }, desc: r.orderBy.desc ?? true }
        : { dimension: { dimensionName: r.orderBy.dimension }, desc: r.orderBy.desc ?? false },
    ];
  if (r.hostFilter !== false) {
    const f = hostnameFilter();
    if (f) body.dimensionFilter = f;
  }
  return body;
}

function parse(rep: any): GaRow[] {
  return (rep?.rows ?? []).map((row: any) => ({
    dims: (row.dimensionValues ?? []).map((d: any) => d.value ?? ""),
    mets: (row.metricValues ?? []).map((m: any) => Number(m.value ?? 0)),
  }));
}

/** Chạy nhiều báo cáo cùng lúc (GA cho tối đa 5 báo cáo / lần gọi) */
export async function gaReports(reqs: GaRequest[]): Promise<GaRow[][]> {
  const out: GaRow[][] = [];
  for (let i = 0; i < reqs.length; i += 5) {
    const chunk = reqs.slice(i, i + 5);
    const j = await call("batchRunReports", { requests: chunk.map(toApi) });
    out.push(...(j.reports ?? []).map(parse));
  }
  return out;
}

/** Số người đang xem web (30 phút gần nhất) */
export async function gaRealtimeUsers(): Promise<number> {
  const j = await call("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }, 30_000);
  return Number(j?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}
