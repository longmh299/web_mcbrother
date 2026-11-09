// app/admin/truy-cap/page.tsx
// Thống kê lượt truy cập website. Không tính: bot Google & bot khác, admin đang đăng nhập, IP loại trừ.
import Link from "next/link";
import { headers } from "next/headers";
import { Eye, Monitor, ShieldOff, Smartphone, Trash2, Users, Activity, MousePointer2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";
import { getExcludedIps, ipMatches, networkPrefix, normIp } from "@/lib/track-filter";
import { addCurrentIp, addExcludedIp, removeExcludedIp } from "./actions";
import ForgetThisDevice from "@/components/admin/ForgetThisDevice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Lượt truy cập" };

const RANGES = [7, 30, 90] as const;
const TZ = "Asia/Ho_Chi_Minh";

const SOURCE_LABEL: Record<string, string> = {
  google: "Google",
  direct: "Vào thẳng / không rõ",
  facebook: "Facebook",
  zalo: "Zalo",
  youtube: "YouTube",
  tiktok: "TikTok",
  bing: "Bing",
  coccoc: "Cốc Cốc",
  other: "Trang khác",
};

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD */
const vnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

function pct(cur: number, prev: number) {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

type DayRow = { d: string; views: number; sessions: number; visitors: number };
type TotRow = { views: number; sessions: number; visitors: number };

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(d)) ? Number(d) : 30;

  const now = new Date();
  const from = new Date(now.getTime() - days * 86400e3);
  const prevFrom = new Date(from.getTime() - days * 86400e3);
  const todayStart = new Date(`${vnDay(now)}T00:00:00+07:00`);
  const online = new Date(now.getTime() - 5 * 60e3);
  const inRange = { createdAt: { gte: from } };

  const totals = (gte: Date, lt?: Date) =>
    prisma.$queryRaw<TotRow[]>`
      SELECT count(*)::int AS views,
             count(*) FILTER (WHERE "isEntry")::int AS sessions,
             count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView"
      WHERE "createdAt" >= ${gte} AND "createdAt" < ${lt ?? new Date(now.getTime() + 60e3)}`;

  let loadError = "";
  const [cur, prev, today, onlineRows, perDayRows, byPage, bySource, byDevice, byRef, excluded] = await Promise.all([
    totals(from),
    totals(prevFrom, from),
    totals(todayStart),
    prisma.$queryRaw<{ n: number }[]>`SELECT count(DISTINCT "visitorId")::int AS n FROM "PageView" WHERE "createdAt" >= ${online}`,
    prisma.$queryRaw<DayRow[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS d,
             count(*)::int AS views,
             count(*) FILTER (WHERE "isEntry")::int AS sessions,
             count(DISTINCT "visitorId")::int AS visitors
      FROM "PageView"
      WHERE "createdAt" >= ${from}
      GROUP BY 1`,
    prisma.pageView.groupBy({ by: ["page"], where: inRange, _count: { _all: true }, orderBy: { _count: { page: "desc" } }, take: 12 }),
    prisma.pageView.groupBy({ by: ["source"], where: { ...inRange, isEntry: true }, _count: { _all: true } }),
    prisma.pageView.groupBy({ by: ["device"], where: { ...inRange, isEntry: true }, _count: { _all: true } }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { ...inRange, isEntry: true, referrer: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 8,
    }),
    prisma.excludedIp.findMany({ orderBy: { createdAt: "desc" } }),
  ]).catch((e) => {
    console.error("VISITS_ERROR", e);
    loadError = String(e?.message ?? e).split("\n").filter(Boolean).slice(-1)[0] ?? "Lỗi không rõ";
    const z = [{ views: 0, sessions: 0, visitors: 0 }];
    return [z, z, z, [{ n: 0 }], [], [], [], [], [], []] as any[];
  });

  const c: TotRow = cur[0] ?? { views: 0, sessions: 0, visitors: 0 };
  const p: TotRow = prev[0] ?? { views: 0, sessions: 0, visitors: 0 };
  const t: TotRow = today[0] ?? { views: 0, sessions: 0, visitors: 0 };
  const onlineNow = onlineRows[0]?.n ?? 0;

  // ----- IP hiện tại của admin & đã loại trừ chưa -----
  const myIp = normIp(clientIp(await headers()));
  const envIps = (process.env.TRACK_EXCLUDE_IPS || "").split(/[,\s]+/).filter(Boolean);
  const allRules = await getExcludedIps();
  const myIpExcluded = myIp !== "unknown" && allRules.some((r) => ipMatches(myIp, r));
  const myPrefix = networkPrefix(myIp);
  const isV6 = myIp.includes(":");

  // ----- theo ngày -----
  const perDay = new Map<string, DayRow>();
  for (let i = days - 1; i >= 0; i--) {
    const k = vnDay(new Date(now.getTime() - i * 86400e3));
    perDay.set(k, { d: k, views: 0, sessions: 0, visitors: 0 });
  }
  for (const r of perDayRows as DayRow[]) if (perDay.has(r.d)) perDay.set(r.d, r);
  const series = [...perDay.values()];
  const max = Math.max(1, ...series.map((r) => r.sessions));
  const niceMax = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / 10) * 10;
  const shortDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  const labelEvery = days <= 7 ? 1 : days <= 30 ? 5 : 15;

  // ----- tên trang dễ đọc -----
  const slugOf = (re: RegExp) => byPage.map((r: any) => r.page.match(re)?.[1]).filter(Boolean);
  const [prods, posts, cats] = await Promise.all([
    prisma.product.findMany({ where: { slug: { in: slugOf(/^\/san-pham\/([^/?#]+)/) } }, select: { slug: true, name: true } }),
    prisma.post.findMany({ where: { slug: { in: slugOf(/^\/tin-tuc\/([^/?#]+)/) } }, select: { slug: true, title: true } }),
    prisma.category.findMany({ where: { slug: { in: slugOf(/^\/([^/?#]+)$/) } }, select: { slug: true, name: true } }),
  ]).catch(() => [[], [], []] as any[]);
  const pageName = (page: string) => {
    const fixed: Record<string, string> = {
      "/": "Trang chủ",
      "/lien-he": "Liên hệ",
      "/gioi-thieu": "Giới thiệu",
      "/san-pham": "Danh sách sản phẩm",
      "/tin-tuc": "Danh sách tin tức",
      "/tim-kiem": "Tìm kiếm",
      "/chinh-sach-bao-hanh-giao-hang": "Chính sách bảo hành & giao hàng",
    };
    if (fixed[page]) return fixed[page];
    const ps = page.match(/^\/san-pham\/([^/?#]+)/)?.[1];
    if (ps) return prods.find((x: any) => x.slug === ps)?.name ?? page;
    const ns = page.match(/^\/tin-tuc\/([^/?#]+)/)?.[1];
    if (ns) return posts.find((x: any) => x.slug === ns)?.title ?? page;
    const cs = page.match(/^\/([^/?#]+)$/)?.[1];
    if (cs) return cats.find((x: any) => x.slug === cs)?.name ? `Danh mục: ${cats.find((x: any) => x.slug === cs).name}` : page;
    return page;
  };

  const sessionsTotal = bySource.reduce((s: number, r: any) => s + r._count._all, 0);
  const sources = [...bySource]
    .map((r: any) => ({ key: r.source ?? "direct", n: r._count._all }))
    .reduce((acc: { key: string; n: number }[], r) => {
      const f = acc.find((x) => x.key === r.key);
      f ? (f.n += r.n) : acc.push({ ...r });
      return acc;
    }, [])
    .sort((a, b) => b.n - a.n);
  const mobile = byDevice.find((r: any) => r.device === "mobile")?._count._all ?? 0;
  const devTotal = byDevice.reduce((s: number, r: any) => s + r._count._all, 0);
  const mobilePct = devTotal ? Math.round((mobile / devTotal) * 100) : 0;
  const pagesPerSession = c.sessions ? (c.views / c.sessions).toFixed(1) : "0";

  const kpis = [
    { label: "Lượt truy cập", hint: "Số phiên (lần khách vào web)", v: c.sessions, prev: p.sessions, icon: Activity },
    { label: "Khách", hint: "Số trình duyệt khác nhau", v: c.visitors, prev: p.visitors, icon: Users },
    { label: "Lượt xem trang", hint: `${pagesPerSession} trang / lượt truy cập`, v: c.views, prev: p.views, icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Không đọc được dữ liệu truy cập.</strong> Hãy chạy <code>npx prisma db push</code> và{" "}
          <code>npx prisma generate</code>, sau đó <strong>tắt hẳn rồi chạy lại</strong> <code>npm run dev</code>.
          <div className="mt-1 break-all font-mono text-xs text-red-600">{loadError}</div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lượt truy cập</h1>
          <p className="mt-1 text-sm text-slate-500">Khách thật vào website — đã loại bot Google, bot khác và mạng nội bộ</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/truy-cap?d=${r}`}
              className={`rounded-md px-3 py-1.5 font-medium ${r === days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {r} ngày
            </Link>
          ))}
        </div>
      </div>

      {/* ===== Hôm nay ===== */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm">
        <span className="inline-flex items-center gap-2 font-medium text-slate-900">
          <span className="relative flex h-2.5 w-2.5">
            {onlineNow > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${onlineNow ? "bg-emerald-500" : "bg-slate-300"}`} />
          </span>
          {onlineNow} khách đang xem <span className="font-normal text-slate-400">(5 phút qua)</span>
        </span>
        <span className="text-slate-600">
          Hôm nay: <strong className="tabular-nums text-slate-900">{t.sessions}</strong> lượt truy cập ·{" "}
          <strong className="tabular-nums text-slate-900">{t.visitors}</strong> khách ·{" "}
          <strong className="tabular-nums text-slate-900">{t.views}</strong> lượt xem
        </span>
      </div>

      {/* ===== Tổng ===== */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => {
          const ch = pct(k.v, k.prev);
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Icon size={16} className="text-slate-400" /> {k.label} · {days} ngày
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{k.v.toLocaleString("vi-VN")}</div>
              <div className="mt-1 text-xs">
                {ch === null ? (
                  <span className="text-slate-500">Kỳ trước chưa có dữ liệu</span>
                ) : (
                  <span className={ch >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {ch >= 0 ? "▲" : "▼"} {Math.abs(ch)}% <span className="text-slate-500">so với {days} ngày trước</span>
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-400">{k.hint}</div>
            </div>
          );
        })}
      </div>

      {/* ===== Biểu đồ theo ngày ===== */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Lượt truy cập mỗi ngày</h2>
        <p className="text-xs text-slate-500">Rê chuột vào cột để xem số khách và lượt xem trang</p>
        <div className="mt-5 flex gap-3">
          <div className="flex h-48 flex-col justify-between text-right text-[11px] tabular-nums text-slate-400">
            <span>{niceMax}</span>
            <span>{niceMax / 2}</span>
            <span>0</span>
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48">
              <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
              <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />
            </div>
            <div className="relative flex h-48 items-end" style={{ gap: days > 30 ? 1 : 3 }}>
              {series.map((r) => (
                <div key={r.d} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[28px] rounded-t-[4px] bg-blue-600 transition group-hover:bg-blue-700"
                    style={{ height: `${(r.sessions / niceMax) * 100}%`, minHeight: r.sessions ? 2 : 0 }}
                  />
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block">
                    <div className="font-semibold">{shortDay(r.d)}</div>
                    {r.sessions} lượt truy cập · {r.visitors} khách · {r.views} lượt xem
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex text-[11px] text-slate-400" style={{ gap: days > 30 ? 1 : 3 }}>
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
          {byPage.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {byPage.map((r: any, i: number) => {
                const n = r._count._all;
                return (
                  <li key={r.page} className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                      <a href={r.page} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-blue-700" title={r.page}>
                        {pageName(r.page)}
                      </a>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{n.toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="ml-8 mt-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${(n / byPage[0]._count._all) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="space-y-6">
          {/* ===== Nguồn khách ===== */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-semibold text-slate-900">Khách đến từ đâu</h2>
              <span className="inline-flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Smartphone size={13} /> {mobilePct}%</span>
                <span className="inline-flex items-center gap-1"><Monitor size={13} /> {devTotal ? 100 - mobilePct : 0}%</span>
              </span>
            </header>
            {sources.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">Chưa có dữ liệu</p>
            ) : (
              <ul className="space-y-2.5 px-5 py-4">
                {sources.map((s) => {
                  const share = sessionsTotal ? Math.round((s.n / sessionsTotal) * 100) : 0;
                  return (
                    <li key={s.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-800">{SOURCE_LABEL[s.key] ?? s.key}</span>
                        <span className="tabular-nums text-slate-500">
                          <strong className="text-slate-900">{s.n}</strong> · {share}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {byRef.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <div className="mb-1.5 text-xs font-medium text-slate-500">Trang giới thiệu</div>
                <div className="flex flex-wrap gap-1.5">
                  {byRef.map((r: any) => (
                    <span key={r.referrer} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {r.referrer} <strong className="tabular-nums">{r._count._all}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ===== IP loại trừ ===== */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldOff size={17} className="text-slate-400" /> Mạng không tính vào thống kê
              </h2>
              <p className="text-xs text-slate-500">Lượt xem & lượt bấm liên hệ từ các IP này sẽ bị bỏ qua (máy công ty, wifi nhà…)</p>
            </header>

            <div className="space-y-3 px-5 py-4">
              <div className={`rounded-lg px-3 py-2.5 text-sm ${myIpExcluded ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                IP mạng bạn đang dùng: <code className="break-all font-mono font-semibold">{myIp}</code>
                {myIpExcluded ? " — đã được loại trừ ✓" : " — chưa loại trừ"}
              </div>

              {!myIpExcluded && myIp !== "unknown" && (
                <div className="flex flex-wrap gap-2">
                  <form action={addCurrentIp}>
                    <input type="hidden" name="mode" value="network" />
                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      <MousePointer2 size={15} /> Loại trừ mạng này{isV6 ? ` (${myPrefix})` : ""}
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
                      <span className="text-xs text-slate-400">từ TRACK_EXCLUDE_IPS (.env)</span>
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
                  placeholder="IP, VD: 14.161.20.5 hoặc 2402:800:6314:*"
                  className="min-w-0 flex-[2] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
                />
                <input
                  name="note"
                  placeholder="Ghi chú (VD: Văn phòng)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Thêm
                </button>
              </form>

              <p className="text-xs leading-relaxed text-slate-400">
                Mạng nhà mạng (Viettel, VNPT, FPT) có thể đổi IP sau khi khởi động lại modem — vào lại trang này để kiểm tra. Dùng
                dấu <code>*</code> ở cuối để chặn cả dải IP. Khi đăng nhập admin, mọi thiết bị của bạn cũng tự động không bị đếm.
              </p>
              <ForgetThisDevice />
            </div>
          </section>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Số liệu bắt đầu được ghi từ khi cập nhật tính năng này. Không tính Googlebot và các crawler của Google (Google-InspectionTool,
        GoogleOther, AdsBot, PageSpeed…), bot Bing/Facebook/Zalo/công cụ SEO, admin đang đăng nhập và các IP loại trừ. Một phiên kết
        thúc sau 30 phút khách không thao tác.
      </p>
    </div>
  );
}
