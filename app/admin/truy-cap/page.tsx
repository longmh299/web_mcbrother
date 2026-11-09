// app/admin/truy-cap/page.tsx
// Lượt truy cập website — đọc từ Google Analytics 4 (GA4 Data API).
// Lọc: chỉ tính đúng tên miền web (loại spam), làm nổi "phiên tương tác" (bot gần như không có),
// và trình duyệt admin / mạng công ty không tải GA nên không bị đếm (xem /api/ga-status).
import Link from "next/link";
import { headers } from "next/headers";
import { Activity, Clock, Eye, MapPin, Monitor, ShieldOff, Smartphone, Tablet, Trash2, UserPlus, Users, Zap, MousePointer2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";
import { getExcludedIps, ipMatches, networkPrefix, normIp } from "@/lib/track-filter";
import { gaConfigured, gaMissingEnv, gaRealtimeUsers, gaReports, type GaRow } from "@/lib/ga4";
import { addCurrentIp, addExcludedIp, removeExcludedIp } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Lượt truy cập" };

const RANGES = [7, 28, 90] as const;
const TZ = "Asia/Ho_Chi_Minh";

const CHANNEL: Record<string, string> = {
  "Organic Search": "Tìm kiếm tự nhiên (Google…)",
  Direct: "Truy cập trực tiếp",
  "Organic Social": "Mạng xã hội",
  Referral: "Trang web khác giới thiệu",
  "Paid Search": "Quảng cáo Google",
  "Paid Social": "Quảng cáo mạng xã hội",
  "Organic Video": "Video (YouTube…)",
  "Paid Video": "Quảng cáo video",
  Email: "Email",
  "Organic Shopping": "Mua sắm",
  "Paid Shopping": "Quảng cáo mua sắm",
  Display: "Quảng cáo hiển thị",
  "Cross-network": "Quảng cáo đa kênh",
  "AI Assistant": "Trợ lý AI (ChatGPT…)",
  SMS: "Tin nhắn SMS",
  Unassigned: "Không xác định",
};

// ---------- ngày giờ theo giờ Việt Nam ----------
const vnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400e3);
const isYmd = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const dmy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

function pct(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtDur = (sec: number) => {
  const s = Math.round(sec);
  return s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60}s` : `${s} giây`;
};

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ d?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = vnDay(new Date());

  // ----- khoảng thời gian -----
  let from: string, to: string, preset: number | null = null;
  if (isYmd(sp.from) && isYmd(sp.to) && sp.from! <= sp.to!) {
    from = sp.from!;
    to = sp.to! > today ? today : sp.to!;
    if (diffDays(from, to) > 730) from = addDays(to, -730);
  } else {
    preset = (RANGES as readonly number[]).includes(Number(sp.d)) ? Number(sp.d) : 28;
    to = today;
    from = addDays(today, -(preset - 1));
  }
  const days = diffDays(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  // ----- IP / mạng loại trừ -----
  const myIp = normIp(clientIp(await headers()));
  const envIps = (process.env.TRACK_EXCLUDE_IPS || "").split(/[,\s]+/).filter(Boolean);
  const [excluded, rules] = await Promise.all([
    prisma.excludedIp.findMany({ orderBy: { createdAt: "desc" } }).catch(() => [] as any[]),
    getExcludedIps(),
  ]);
  const myIpExcluded = myIp !== "unknown" && rules.some((r: string) => ipMatches(myIp, r));
  const isV6 = myIp.includes(":");

  // ----- số liệu GA4 -----
  const configured = gaConfigured();
  let error = "";
  let rep: GaRow[][] = [];
  let online = 0;
  if (configured) {
    const cur = { startDate: from, endDate: to, name: "cur" };
    const prev = { startDate: prevFrom, endDate: prevTo, name: "prev" };
    try {
      [rep, online] = await Promise.all([
        gaReports([
          // 0: tổng, 2 kỳ
          {
            dateRanges: [cur, prev],
            metrics: ["totalUsers", "newUsers", "sessions", "engagedSessions", "screenPageViews", "engagementRate", "averageSessionDuration"],
          },
          // 1: theo ngày
          { dateRanges: [cur], dimensions: ["date"], metrics: ["sessions", "engagedSessions", "totalUsers", "screenPageViews"], orderBy: { dimension: "date" }, limit: 800 },
          // 2: trang xem nhiều
          { dateRanges: [cur], dimensions: ["pagePath", "pageTitle"], metrics: ["screenPageViews", "totalUsers"], orderBy: { metric: "screenPageViews" }, limit: 30 },
          // 3: kênh
          { dateRanges: [cur], dimensions: ["sessionDefaultChannelGroup"], metrics: ["sessions", "engagedSessions"], orderBy: { metric: "sessions" }, limit: 20 },
          // 4: nguồn cụ thể
          { dateRanges: [cur], dimensions: ["sessionSource"], metrics: ["sessions", "engagedSessions"], orderBy: { metric: "sessions" }, limit: 10 },
          // 5: thiết bị
          { dateRanges: [cur], dimensions: ["deviceCategory"], metrics: ["sessions"] },
          // 6: tỉnh / thành
          { dateRanges: [cur], dimensions: ["city"], metrics: ["sessions", "engagedSessions"], orderBy: { metric: "sessions" }, limit: 10 },
        ]),
        gaRealtimeUsers().catch(() => 0),
      ]);
    } catch (e: any) {
      console.error("GA4_ERROR", e);
      error = String(e?.message ?? e);
    }
  }
  const [totalsR = [], dailyR = [], pagesR = [], channelR = [], sourceR = [], deviceR = [], cityR = []] = rep;

  // tổng 2 kỳ (khi có 2 khoảng ngày, GA thêm cột "dateRange" vào cuối)
  const pick = (name: string) => totalsR.find((r) => r.dims.includes(name))?.mets ?? [0, 0, 0, 0, 0, 0, 0];
  const [users, newUsers, sessions, engaged, views, engRate, avgDur] = pick("cur");
  const [pUsers, , pSessions, pEngaged, pViews, pEngRate, pAvgDur] = pick("prev");

  const kpis = [
    { label: "Người dùng", v: fmt(users), ch: pct(users, pUsers), icon: Users },
    { label: "Người dùng mới", v: fmt(newUsers), ch: null, icon: UserPlus },
    { label: "Phiên truy cập", v: fmt(sessions), ch: pct(sessions, pSessions), icon: Activity },
    { label: "Lượt xem trang", v: fmt(views), ch: pct(views, pViews), icon: Eye, hint: sessions ? `${(views / sessions).toFixed(1)} trang / phiên` : "" },
    { label: "Thời gian TB / phiên", v: fmtDur(avgDur), ch: pct(avgDur, pAvgDur), icon: Clock },
  ];

  // theo ngày (điền 0 cho ngày trống)
  const byDay = new Map(dailyR.map((r) => [`${r.dims[0].slice(0, 4)}-${r.dims[0].slice(4, 6)}-${r.dims[0].slice(6, 8)}`, r.mets]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    const m = byDay.get(d) ?? [0, 0, 0, 0];
    return { d, sessions: m[0], engaged: m[1], users: m[2], views: m[3] };
  });
  const max = Math.max(1, ...series.map((r) => r.sessions));
  const niceMax = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / (max > 200 ? 100 : 10)) * (max > 200 ? 100 : 10);
  const labelEvery = days <= 7 ? 1 : days <= 31 ? 5 : days <= 92 ? 15 : 30;
  const shortDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;

  // trang: gộp các tiêu đề khác nhau của cùng 1 đường dẫn
  const pages = [...pagesR.reduce((m, r) => {
    const path = r.dims[0] || "/";
    const e = m.get(path) ?? { path, title: r.dims[1], views: 0, users: 0 };
    e.views += r.mets[0];
    e.users += r.mets[1];
    m.set(path, e);
    return m;
  }, new Map<string, { path: string; title: string; views: number; users: number }>()).values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);
  const cleanTitle = (t: string) => t.replace(/\s*[|–-]\s*MCBROTHER.*$/i, "").trim() || t;

  const chTotal = channelR.reduce((s, r) => s + r.mets[0], 0);
  const devTotal = deviceR.reduce((s, r) => s + r.mets[0], 0);
  const dev = (k: string) => deviceR.find((r) => r.dims[0] === k)?.mets[0] ?? 0;
  const devPct = (k: string) => (devTotal ? Math.round((dev(k) / devTotal) * 100) : 0);

  const rangeHref = (r: number) => `/admin/truy-cap?d=${r}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lượt truy cập</h1>
          <p className="mt-1 text-sm text-slate-500">
            Số liệu Google Analytics · {dmy(from)} → {dmy(to)}
          </p>
        </div>
        <form action="/admin/truy-cap" className="flex flex-wrap items-end gap-2 text-sm">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={rangeHref(r)}
                className={`rounded-md px-3 py-1.5 font-medium ${r === preset ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {r} ngày
              </Link>
            ))}
          </div>
          <label className="flex flex-col text-xs text-slate-500">
            Từ ngày
            <input type="date" name="from" defaultValue={from} max={today} className="mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800" />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            Đến ngày
            <input type="date" name="to" defaultValue={to} max={today} className="mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800" />
          </label>
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Xem</button>
        </form>
      </div>

      {!configured && <SetupGuide missing={gaMissingEnv()} />}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Không đọc được số liệu Google Analytics.</strong>
          <div className="mt-1 break-words text-xs text-red-700">{error}</div>
        </div>
      )}

      {configured && !error && (
        <>
          {/* ===== Đang online + phiên tương tác ===== */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <span className="relative flex h-3 w-3">
                {online > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
              </span>
              <div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">{online}</div>
                <div className="text-xs text-slate-500">người đang xem web (30 phút qua)</div>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                  <Zap size={16} /> Phiên có tương tác (khách thật)
                </span>
                <span className="text-2xl font-bold tabular-nums text-emerald-900">{fmt(engaged)}</span>
                <span className="text-sm text-emerald-800">
                  / {fmt(sessions)} phiên · tỉ lệ tương tác <strong>{(engRate * 100).toFixed(1)}%</strong>
                </span>
                <Change v={pct(engaged, pEngaged)} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
                Khách ở lại trên 10 giây, xem từ 2 trang hoặc bấm liên hệ. Bot thường vào rồi thoát ngay nên gần như không có
                ở đây — đây là con số sát với khách thật nhất. (Kỳ trước: {(pEngRate * 100).toFixed(1)}%)
              </p>
            </div>
          </div>

          {/* ===== KPI ===== */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon size={15} className="text-slate-400" /> {k.label}
                  </div>
                  <div className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{k.v}</div>
                  <div className="mt-1 text-xs">
                    <Change v={k.ch} suffix={`so với ${days} ngày trước`} />
                  </div>
                  {k.hint && <div className="mt-0.5 text-xs text-slate-400">{k.hint}</div>}
                </div>
              );
            })}
          </div>

          {/* ===== Biểu đồ theo ngày ===== */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">Phiên truy cập mỗi ngày</h2>
                <p className="text-xs text-slate-500">Rê chuột vào cột để xem chi tiết. Ngày cột nhạt cao vọt mà phần đậm thấp → thường là bot.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Có tương tác</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-200" /> Không tương tác</span>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <div className="flex h-52 flex-col justify-between text-right text-[11px] tabular-nums text-slate-400">
                <span>{fmt(niceMax)}</span>
                <span>{fmt(niceMax / 2)}</span>
                <span>0</span>
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-52">
                  <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
                  <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />
                </div>
                <div className="relative flex h-52 items-end" style={{ gap: days > 31 ? 1 : 3 }}>
                  {series.map((r) => (
                    <div key={r.d} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                      <div
                        className="flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t-[4px] bg-blue-200 transition group-hover:bg-blue-300"
                        style={{ height: `${(r.sessions / niceMax) * 100}%`, minHeight: r.sessions ? 2 : 0 }}
                      >
                        <div className="w-full bg-blue-600 group-hover:bg-blue-700" style={{ height: r.sessions ? `${(r.engaged / r.sessions) * 100}%` : 0 }} />
                      </div>
                      <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow group-hover:block">
                        <div className="font-semibold">{dmy(r.d)}</div>
                        <div>{fmt(r.sessions)} phiên · <span className="text-blue-300">{fmt(r.engaged)} có tương tác</span></div>
                        <div>{fmt(r.users)} người dùng · {fmt(r.views)} lượt xem</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex text-[11px] text-slate-400" style={{ gap: days > 31 ? 1 : 3 }}>
                  {series.map((r, i) => (
                    <div key={r.d} className="relative min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                      {(series.length - 1 - i) % labelEvery === 0 ? shortDay(r.d) : ""}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
            {/* ===== Trang xem nhiều ===== */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-3.5">
                <h2 className="font-semibold text-slate-900">Trang được xem nhiều nhất</h2>
              </header>
              {pages.length === 0 ? (
                <Empty />
              ) : (
                <ol className="divide-y divide-slate-100">
                  {pages.map((p, i) => (
                    <li key={p.path} className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                        <a href={p.path} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:text-blue-700" title={p.path}>
                          <span className="block truncate text-sm text-slate-800">{p.path === "/" ? "Trang chủ" : cleanTitle(p.title)}</span>
                          <span className="block truncate text-[11px] text-slate-400">{p.path}</span>
                        </a>
                        <span className="text-right text-sm font-semibold tabular-nums text-slate-900">
                          {fmt(p.views)}
                          <span className="block text-[11px] font-normal text-slate-400">{fmt(p.users)} người</span>
                        </span>
                      </div>
                      <div className="ml-8 mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${(p.views / pages[0].views) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="space-y-6">
              {/* ===== Kênh ===== */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h2 className="font-semibold text-slate-900">Khách đến từ đâu</h2>
                  <span className="inline-flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1" title="Điện thoại"><Smartphone size={13} /> {devPct("mobile")}%</span>
                    <span className="inline-flex items-center gap-1" title="Máy tính"><Monitor size={13} /> {devPct("desktop")}%</span>
                    {dev("tablet") > 0 && <span className="inline-flex items-center gap-1" title="Máy tính bảng"><Tablet size={13} /> {devPct("tablet")}%</span>}
                  </span>
                </header>
                {channelR.length === 0 ? (
                  <Empty />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-5 pb-1 pt-3 font-medium">Kênh</th>
                        <th className="px-2 pb-1 pt-3 text-right font-medium">Phiên</th>
                        <th className="px-5 pb-1 pt-3 text-right font-medium">Tương tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelR.map((r) => {
                        const share = chTotal ? (r.mets[0] / chTotal) * 100 : 0;
                        const er = r.mets[0] ? Math.round((r.mets[1] / r.mets[0]) * 100) : 0;
                        return (
                          <tr key={r.dims[0]}>
                            <td className="px-5 py-1.5">
                              <div className="text-slate-800">{CHANNEL[r.dims[0]] ?? r.dims[0]}</div>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">
                              <strong>{fmt(r.mets[0])}</strong> <span className="text-xs text-slate-400">{Math.round(share)}%</span>
                            </td>
                            <td className={`px-5 py-1.5 text-right tabular-nums ${er < 20 ? "text-red-600" : "text-slate-600"}`} title={er < 20 ? "Tỉ lệ tương tác rất thấp — có thể nhiều bot" : ""}>
                              {er}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {sourceR.length > 0 && (
                  <div className="mt-2 border-t border-slate-100 px-5 py-3">
                    <div className="mb-1.5 text-xs font-medium text-slate-500">Nguồn cụ thể</div>
                    <div className="flex flex-wrap gap-1.5">
                      {sourceR.map((r) => (
                        <span key={r.dims[0]} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {r.dims[0] === "(direct)" ? "trực tiếp" : r.dims[0]} <strong className="tabular-nums">{fmt(r.mets[0])}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ===== Tỉnh / thành ===== */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-100 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin size={16} className="text-slate-400" /> Tỉnh / thành phố
                  </h2>
                </header>
                {cityR.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="grid grid-cols-1 gap-x-6 px-5 py-3 sm:grid-cols-2">
                    {cityR.map((r) => (
                      <li key={r.dims[0]} className="flex items-center justify-between py-1 text-sm">
                        <span className="truncate text-slate-800">{r.dims[0] === "(not set)" ? "Không xác định" : r.dims[0]}</span>
                        <span className="tabular-nums text-slate-900">
                          <strong>{fmt(r.mets[0])}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {/* ===== Mạng loại trừ ===== */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldOff size={17} className="text-slate-400" /> Mạng không tính vào thống kê
          </h2>
          <p className="text-xs text-slate-500">
            Máy vào web từ các IP này sẽ không tải Google Analytics và không ghi lượt bấm liên hệ (máy công ty, wifi nhà…). Chỉ có
            tác dụng từ lúc thêm, không xoá được số liệu cũ trong GA.
          </p>
        </header>
        <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className={`rounded-lg px-3 py-2.5 text-sm ${myIpExcluded ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
              IP mạng bạn đang dùng: <code className="break-all font-mono font-semibold">{myIp}</code>
              {myIpExcluded ? " — đã được loại trừ ✓" : " — chưa loại trừ"}
            </div>
            {!myIpExcluded && myIp !== "unknown" && (
              <div className="flex flex-wrap gap-2">
                <form action={addCurrentIp}>
                  <input type="hidden" name="mode" value="network" />
                  <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <MousePointer2 size={15} /> Loại trừ mạng này{isV6 ? ` (${networkPrefix(myIp)})` : ""}
                  </button>
                </form>
                {isV6 && (
                  <form action={addCurrentIp}>
                    <input type="hidden" name="mode" value="exact" />
                    <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Chỉ IP này
                    </button>
                  </form>
                )}
              </div>
            )}
            <p className="text-xs leading-relaxed text-slate-400">
              Mạng Viettel/VNPT/FPT có thể đổi IP sau khi khởi động lại modem — thỉnh thoảng vào lại đây kiểm tra. Dấu <code>*</code> ở
              cuối để chặn cả dải. Máy đang đăng nhập admin cũng tự động không bị đếm.
            </p>
          </div>
          <div className="space-y-3">
            {excluded.length > 0 || envIps.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {excluded.map((x: any) => (
                  <li key={x.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <code className="min-w-0 flex-1 truncate font-mono text-slate-800" title={x.ip}>{x.ip}</code>
                    <span className="truncate text-xs text-slate-500">{x.note}</span>
                    <form action={removeExcludedIp}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Xoá ${x.ip}`}>
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </li>
                ))}
                {envIps.map((ip) => (
                  <li key={`env-${ip}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <code className="min-w-0 flex-1 truncate font-mono text-slate-800">{ip}</code>
                    <span className="text-xs text-slate-400">từ TRACK_EXCLUDE_IPS</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Chưa có IP nào bị loại trừ.</p>
            )}
            <form action={addExcludedIp} className="flex flex-wrap gap-2">
              <input
                name="ip"
                required
                placeholder="VD: 14.161.20.5 hoặc 2402:800:6314:*"
                className="min-w-0 flex-[2] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
              />
              <input name="note" placeholder="Ghi chú" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Thêm</button>
            </form>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Google Analytics tự loại các bot đã biết (Googlebot, Bingbot…). Trang này lọc thêm: chỉ tính lượt vào đúng tên miền web (loại
        spam giả mạo), không tải GA cho admin, mạng loại trừ và trình duyệt tự động. Số liệu cập nhật sau vài phút đến vài giờ; được lưu
        tạm 5 phút.
      </p>
    </div>
  );
}

function Change({ v, suffix }: { v: number | null; suffix?: string }) {
  if (v === null) return <span className="text-slate-400">Kỳ trước chưa có dữ liệu</span>;
  return (
    <span className={v >= 0 ? "text-emerald-600" : "text-red-600"}>
      {v >= 0 ? "▲" : "▼"} {Math.abs(v)}%{suffix && <span className="text-slate-500"> {suffix}</span>}
    </span>
  );
}

function Empty() {
  return <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này</p>;
}

function SetupGuide({ missing }: { missing: string[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <h2 className="font-semibold">Chưa kết nối Google Analytics</h2>
      <p className="mt-1">
        Thiếu biến môi trường: <code className="font-mono">{missing.join(", ")}</code>
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5">
        <li>
          Google Cloud Console → tạo/chọn project → bật <strong>Google Analytics Data API</strong>.
        </li>
        <li>
          IAM → Service Accounts → tạo tài khoản dịch vụ → tab Keys → <strong>Add key → JSON</strong> (tải file về).
        </li>
        <li>
          Google Analytics → Quản trị → <strong>Quản lý quyền truy cập tài sản</strong> → thêm email tài khoản dịch vụ, vai trò{" "}
          <strong>Người xem</strong>.
        </li>
        <li>
          Lấy <strong>Mã tài sản</strong> (dãy số) ở GA → Quản trị → Chi tiết tài sản.
        </li>
        <li>
          Vercel → Settings → Environment Variables, thêm <code>GA_PROPERTY_ID</code>, <code>GA_CLIENT_EMAIL</code>,{" "}
          <code>GA_PRIVATE_KEY</code> (hoặc dán cả file JSON vào <code>GA_SERVICE_ACCOUNT_JSON</code>) → Redeploy.
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-800">Nếu web quản lý kho đã kết nối GA rồi thì dùng lại đúng tài khoản dịch vụ đó là được.</p>
    </div>
  );
}
