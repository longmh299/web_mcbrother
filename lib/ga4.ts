// lib/ga4.ts
// Đọc số liệu Google Analytics 4 (GA4 Data API) bằng tài khoản dịch vụ (service account).
// Không cần thêm thư viện: tự ký JWT bằng `jose` rồi gọi REST API.
//
// Biến môi trường (chọn 1 trong 2 cách khai tài khoản):
//   GA_PROPERTY_ID=123456789                       ← GA > Quản trị > Chi tiết tài sản (dãy số, KHÔNG phải G-XXXX)
//   GA_CLIENT_EMAIL=xxx@yyy.iam.gserviceaccount.com
//   GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
// hoặc
//   GA_SERVICE_ACCOUNT_JSON='{"client_email":"...","private_key":"..."}'   (dán nguyên file JSON tải về)
// Tuỳ chọn:
//   GA_HOSTNAMES=mcbrother.com.vn,www.mcbrother.com.vn   ← chỉ tính lượt có tên miền này (loại spam "ghost")
import { importPKCS8, SignJWT } from "jose";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://analyticsdata.googleapis.com/v1beta";

export class GaConfigError extends Error {}

function readCreds() {
  let email = process.env.GA_CLIENT_EMAIL || "";
  let key = process.env.GA_PRIVATE_KEY || "";
  const json = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (json && (!email || !key)) {
    try {
      const j = JSON.parse(json);
      email ||= j.client_email || "";
      key ||= j.private_key || "";
    } catch {
      throw new GaConfigError("GA_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ");
    }
  }
  // Vercel/.env hay lưu xuống dòng thành "\n" dạng chữ, hoặc bọc thêm dấu nháy
  key = key.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  const propertyId = (process.env.GA_PROPERTY_ID || "").replace(/^properties\//, "").trim();
  const missing = [
    !propertyId && "GA_PROPERTY_ID",
    !email && "GA_CLIENT_EMAIL",
    !key && "GA_PRIVATE_KEY",
  ].filter(Boolean) as string[];
  return { email, key, propertyId, missing };
}

export function gaConfigured() {
  return readCreds().missing.length === 0;
}

export function gaMissingEnv() {
  return readCreds().missing;
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
    throw new GaConfigError("GA_PRIVATE_KEY sai định dạng (phải là khoá bắt đầu bằng -----BEGIN PRIVATE KEY-----)");
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
      const h = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mcbrother.com.vn").hostname.replace(/^www\./, "");
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
