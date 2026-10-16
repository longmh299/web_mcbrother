// app/admin/thong-ke/page.tsx
// Thống kê lượt khách bấm liên hệ: Gọi / Zalo / Messenger / Email / Báo giá / Gửi form.
import Link from "next/link";
import { Mail, MessageCircle, Monitor, Phone, Send, Smartphone, FileText, MousePointerClick } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LEAD_TYPES, type LeadType } from "@/lib/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Thống kê liên hệ" };

const RANGES = [7, 30, 90] as const;
const TZ = "Asia/Ho_Chi_Minh";

const ICON: Record<LeadType, any> = {
  call: Phone,
  zalo: MessageCircle,
  messenger: Send,
  email: Mail,
  quote: MousePointerClick,
  form: FileText,
};

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD */
const vnDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

function pct(cur: number, prev: number) {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(d)) ? Number(d) : 30;

  const now = new Date();
  const from = new Date(now.getTime() - days * 86400e3);
  const prevFrom = new Date(from.getTime() - days * 86400e3);
  const inRange = { createdAt: { gte: from } };

  let loadError = "";
  const [byType, prevByType, byPage, byLabel, byDevice, events, recent] = await Promise.all([
    prisma.clickEvent.groupBy({ by: ["type"], where: inRange, _count: { _all: true } }),
    prisma.clickEvent.groupBy({ by: ["type"], where: { createdAt: { gte: prevFrom, lt: from } }, _count: { _all: true } }),
    prisma.clickEvent.groupBy({ by: ["page"], where: inRange, _count: { _all: true }, orderBy: { _count: { page: "desc" } }, take: 10 }),
    prisma.clickEvent.groupBy({
      by: ["type", "label"],
      where: { ...inRange, label: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { label: "desc" } },
      take: 8,
    }),
    prisma.clickEvent.groupBy({ by: ["device"], where: inRange, _count: { _all: true } }),
    prisma.clickEvent.findMany({ where: inRange, select: { createdAt: true }, take: 50000 }),
    prisma.clickEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, type: true, page: true, label: true, device: true, createdAt: true } }),
  ]).catch((e) => {
    console.error("STATS_ERROR", e);
    loadError = String(e?.message ?? e).split("\n").filter(Boolean).slice(-1)[0] ?? "Lỗi không rõ";
    return [[], [], [], [], [], [], []] as any[];
  });

  const count = (rows: any[], t: string) => rows.find((r) => r.type === t)?._count._all ?? 0;
  const total = byType.reduce((s: number, r: any) => s + r._count._all, 0);
  const prevTotal = prevByType.reduce((s: number, r: any) => s + r._count._all, 0);

  // ----- số lượt theo ngày -----
  const perDay = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) perDay.set(vnDay(new Date(now.getTime() - i * 86400e3)), 0);
  for (const e of events) {
    const k = vnDay(new Date(e.createdAt));
    if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const series = [...perDay.entries()];
  const max = Math.max(1, ...series.map(([, v]) => v));
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;

  // ----- tên trang dễ đọc (sản phẩm / bài viết) -----
  const prodSlugs = byPage.map((r: any) => r.page.match(/^\/san-pham\/([^/?#]+)/)?.[1]).filter(Boolean);
  const postSlugs = byPage.map((r: any) => r.page.match(/^\/tin-tuc\/([^/?#]+)/)?.[1]).filter(Boolean);
  const [prods, posts] = await Promise.all([
    prodSlugs.length ? prisma.product.findMany({ where: { slug: { in: prodSlugs } }, select: { slug: true, name: true, id: true } }) : [],
    postSlugs.length ? prisma.post.findMany({ where: { slug: { in: postSlugs } }, select: { slug: true, title: true } }) : [],
  ]).catch(() => [[], []] as any[]);
  const pageName = (page: string) => {
    if (page === "/") return "Trang chủ";
    if (page === "/lien-he") return "Trang Liên hệ";
    if (page === "/gioi-thieu") return "Giới thiệu";
    if (page === "/san-pham") return "Danh sách sản phẩm";
    if (page === "/tin-tuc") return "Danh sách tin tức";
    const ps = page.match(/^\/san-pham\/([^/?#]+)/)?.[1];
    if (ps) return prods.find((p: any) => p.slug === ps)?.name ?? page;
    const ns = page.match(/^\/tin-tuc\/([^/?#]+)/)?.[1];
    if (ns) return posts.find((p: any) => p.slug === ns)?.title ?? page;
    return page;
  };

  const mobile = byDevice.find((r: any) => r.device === "mobile")?._count._all ?? 0;
  const mobilePct = total ? Math.round((mobile / total) * 100) : 0;
  const totalChange = pct(total, prevTotal);
  const fmtTime = (x: Date) =>
    new Date(x).toLocaleString("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const shortDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  const labelEvery = days <= 7 ? 1 : days <= 30 ? 5 : 15;

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Không đọc được dữ liệu thống kê.</strong> Hãy chạy <code>npx prisma db push</code> và{" "}
          <code>npx prisma generate</code>, sau đó <strong>tắt hẳn rồi chạy lại</strong> <code>npm run dev</code>.
          <div className="mt-1 break-all font-mono text-xs text-red-600">{loadError}</div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Thống kê liên hệ</h1>
          <p className="mt-1 text-sm text-slate-500">Số lần khách bấm gọi, nhắn Zalo, báo giá… trên website</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/thong-ke?d=${r}`}
              className={`rounded-md px-3 py-1.5 font-medium ${r === days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {r} ngày
            </Link>
          ))}
        </div>
      </div>

      {/* ===== Tổng ===== */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Tổng lượt liên hệ · {days} ngày</div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-slate-900">{total.toLocaleString("vi-VN")}</div>
          <div className="mt-2 text-sm">
            {totalChange === null ? (
              <span className="text-slate-500">Kỳ trước chưa có dữ liệu</span>
            ) : (
              <span className={totalChange >= 0 ? "text-emerald-600" : "text-red-600"}>
                {totalChange >= 0 ? "▲" : "▼"} {Math.abs(totalChange)}%{" "}
                <span className="text-slate-500">so với {days} ngày trước ({prevTotal})</span>
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Smartphone size={15} className="text-slate-400" /> Điện thoại {mobilePct}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Monitor size={15} className="text-slate-400" /> Máy tính {total ? 100 - mobilePct : 0}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(LEAD_TYPES) as LeadType[]).map((t) => {
            const Icon = ICON[t];
            const c = count(byType, t);
            const ch = pct(c, count(prevByType, t));
            return (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon size={16} className="text-slate-400" />
                  {LEAD_TYPES[t]}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-slate-900">{c}</span>
                  {ch !== null && ch !== 0 && (
                    <span className={`text-xs font-medium ${ch > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {ch > 0 ? "▲" : "▼"} {Math.abs(ch)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Biểu đồ theo ngày ===== */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Lượt liên hệ mỗi ngày</h2>
        <p className="text-xs text-slate-500">Rê chuột vào cột để xem số liệu</p>
        <div className="mt-5 flex gap-3">
          {/* trục Y */}
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
              {series.map(([k, v]) => (
                <div key={k} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                  {/* vùng rê chuột cao hơn cột */}
                  <div
                    className="w-full max-w-[28px] rounded-t-[4px] bg-blue-600 transition group-hover:bg-blue-700"
                    style={{ height: `${(v / niceMax) * 100}%`, minHeight: v ? 2 : 0 }}
                  />
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block">
                    {shortDay(k)}: <strong>{v}</strong> lượt
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex text-[11px] text-slate-400" style={{ gap: days > 30 ? 1 : 3 }}>
              {series.map(([k], i) => (
                <div key={k} className="relative min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                  {(series.length - 1 - i) % labelEvery === 0 ? shortDay(k) : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        {/* ===== Trang mang lại liên hệ ===== */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-semibold text-slate-900">Trang mang lại nhiều liên hệ nhất</h2>
            <p className="text-xs text-slate-500">Khách đang xem trang nào thì bấm liên hệ</p>
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
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{n}</span>
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
          {/* ===== Nút được bấm nhiều ===== */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-semibold text-slate-900">Nút được bấm nhiều nhất</h2>
            </header>
            {byLabel.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">Chưa có dữ liệu</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {byLabel.map((r: any) => (
                    <tr key={`${r.type}-${r.label}`}>
                      <td className="px-5 py-2 text-slate-800">“{r.label}”</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{LEAD_TYPES[r.type as LeadType] ?? r.type}</td>
                      <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{r._count._all}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ===== Gần đây ===== */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-semibold text-slate-900">Lượt bấm gần đây</h2>
            </header>
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">Chưa có dữ liệu</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((e: any) => {
                  const Icon = ICON[e.type as LeadType] ?? MousePointerClick;
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-5 py-2 text-sm">
                      <Icon size={15} className="shrink-0 text-slate-400" />
                      <span className="w-28 shrink-0 text-slate-700">{LEAD_TYPES[e.type as LeadType] ?? e.type}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-500" title={e.page}>
                        {pageName(e.page)}
                      </span>
                      {e.device === "mobile" ? <Smartphone size={14} className="text-slate-300" /> : <Monitor size={14} className="text-slate-300" />}
                      <span className="shrink-0 text-xs text-slate-400">{fmtTime(e.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Số liệu bắt đầu được ghi từ khi cập nhật tính năng này. Không tính lượt bấm của admin đang đăng nhập và bot. Một số
        khách chặn quảng cáo/theo dõi có thể không được ghi nhận.
      </p>
    </div>
  );
}
