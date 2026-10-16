// app/admin/page.tsx
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  FolderTree,
  Inbox,
  Newspaper,
  Package,
  Phone,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bảng điều khiển" };

const fmtTime = (d: Date) =>
  new Date(d).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AdminHome() {
  const live = { published: true };
  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

  const [
    prodTotal,
    prodLive,
    catTotal,
    postTotal,
    postDraft,
    newContacts,
    noImage,
    noSeoDesc,
    noShort,
    noCategory,
    latestContacts,
    recentProducts,
    recentPosts,
  ] = await Promise.all([
    safe(prisma.product.count(), 0),
    safe(prisma.product.count({ where: live }), 0),
    safe(prisma.category.count(), 0),
    safe(prisma.post.count(), 0),
    safe(prisma.post.count({ where: { published: false } }), 0),
    safe(prisma.contactMessage.count({ where: { status: "new" } }), 0),
    // Sản phẩm đang hiển thị nhưng còn thiếu thông tin
    safe(prisma.product.count({ where: { ...live, OR: [{ coverImage: null }, { coverImage: "" }] } }), 0),
    safe(prisma.product.count({ where: { ...live, OR: [{ metaDescription: null }, { metaDescription: "" }] } }), 0),
    safe(prisma.product.count({ where: { ...live, OR: [{ short: null }, { short: "" }] } }), 0),
    safe(prisma.product.count({ where: { ...live, categoryId: null } }), 0),
    safe(
      prisma.contactMessage.findMany({
        where: { status: "new" },
        orderBy: { createdat: "desc" },
        take: 5,
        select: { id: true, name: true, phone: true, email: true, subject: true, message: true, createdat: true },
      }),
      [] as any[]
    ),
    safe(
      prisma.product.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, updatedAt: true, published: true } }),
      [] as any[]
    ),
    safe(
      prisma.post.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, updatedAt: true, published: true } }),
      [] as any[]
    ),
  ]);

  const stats = [
    {
      href: "/admin/lien-he",
      label: "Liên hệ chưa xử lý",
      value: newContacts,
      sub: newContacts ? "Cần gọi lại khách" : "Đã xử lý hết",
      icon: Inbox,
      tone: newContacts ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
    },
    { href: "/admin/products", label: "Sản phẩm", value: prodTotal, sub: `${prodLive} đang hiển thị`, icon: Package, tone: "bg-blue-50 text-blue-600" },
    { href: "/admin/categories", label: "Danh mục SP", value: catTotal, sub: "Quản lý danh mục", icon: FolderTree, tone: "bg-cyan-50 text-cyan-700" },
    { href: "/admin/news", label: "Bài viết", value: postTotal, sub: postDraft ? `${postDraft} bản nháp` : "Không có bản nháp", icon: Newspaper, tone: "bg-amber-50 text-amber-600" },
  ];

  const todo = [
    { n: noImage, label: "sản phẩm chưa có ảnh đại diện", href: "/admin/products?status=published&missing=image" },
    { n: noShort, label: "sản phẩm chưa có mô tả ngắn", href: "/admin/products?status=published&missing=short" },
    { n: noSeoDesc, label: "sản phẩm chưa có mô tả SEO", href: "/admin/products?status=published&missing=seo" },
    { n: noCategory, label: "sản phẩm chưa có danh mục", href: "/admin/products?cat=none" },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bảng điều khiển</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng quan website MCBROTHER</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} /> Thêm sản phẩm
          </Link>
          <Link href="/admin/news/new" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FileText size={16} /> Viết bài
          </Link>
        </div>
      </div>

      {/* Số liệu */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{s.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{s.value.toLocaleString("vi-VN")}</div>
              <div className="mt-1 text-xs text-slate-500">{s.sub}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Liên hệ mới */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-semibold text-slate-900">Liên hệ mới nhất</h2>
            <Link href="/admin/lien-he" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </header>
          {latestContacts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Không có liên hệ nào đang chờ xử lý 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {latestContacts.map((c: any) => (
                <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.phone && (
                        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                          <Phone size={13} /> {c.phone}
                        </a>
                      )}
                      <span className="text-xs text-slate-400">{fmtTime(c.createdat)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">{c.subject || c.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Việc cần làm */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-semibold text-slate-900">Cần bổ sung</h2>
            <p className="text-xs text-slate-500">Sản phẩm đang hiển thị nhưng còn thiếu thông tin — ảnh hưởng tới SEO & khách</p>
          </header>
          {todo.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Sản phẩm đã đủ thông tin cơ bản 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todo.map((t) => (
                <li key={t.label}>
                  <Link href={t.href} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                    <span className="flex-1 text-sm text-slate-700">
                      <strong className="text-slate-900">{t.n}</strong> {t.label}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sửa gần đây */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Sản phẩm sửa gần đây", rows: recentProducts.map((p: any) => ({ id: p.id, name: p.name, at: p.updatedAt, live: p.published, href: `/admin/products/${p.id}/edit` })) },
          { title: "Bài viết sửa gần đây", rows: recentPosts.map((p: any) => ({ id: p.id, name: p.title, at: p.updatedAt, live: p.published, href: `/admin/news/${p.id}/edit` })) },
        ].map((box) => (
          <section key={box.title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-semibold text-slate-900">{box.title}</h2>
            </header>
            <ul className="divide-y divide-slate-100">
              {box.rows.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Chưa có dữ liệu</li>}
              {box.rows.map((r: any) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{r.name}</span>
                    {!r.live && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">Ẩn</span>}
                    <span className="shrink-0 text-xs text-slate-400">{fmtTime(r.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
