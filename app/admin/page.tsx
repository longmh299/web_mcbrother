// app/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Package, FolderTree, Newspaper, Tags, Plus, Inbox } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [prod, cat, post, postCat, newContacts] = await Promise.all([
    prisma.product.count().catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.post.count().catch(() => 0),
    prisma.postCategory.count().catch(() => 0),
    prisma.contactMessage.count({ where: { status: "new" } }).catch(() => 0),
  ]);

  const stats = [
    {
      href: "/admin/lien-he",
      title: "Liên hệ mới",
      desc: "Khách gửi từ website, chưa xử lý",
      count: newContacts,
      icon: Inbox,
      color: newContacts > 0 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500",
    },
    {
      href: "/admin/products",
      title: "Sản phẩm",
      desc: "Quản lý sản phẩm",
      count: prod,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: "/admin/categories",
      title: "Danh mục SP",
      desc: "Quản lý danh mục & gian hàng",
      count: cat,
      icon: FolderTree,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/admin/news",
      title: "Tin tức",
      desc: "Danh sách & soạn bài viết",
      count: post,
      icon: Newspaper,
      color: "bg-amber-50 text-amber-600",
    },
    {
      href: "/admin/news-categories",
      title: "Chuyên mục tin tức",
      desc: "Quản lý chuyên mục bài viết",
      count: postCat,
      icon: Tags,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  const quickActions = [
    { href: "/admin/products/new", label: "Thêm sản phẩm" },
    { href: "/admin/categories/new", label: "Thêm danh mục" },
    { href: "/admin/news/new", label: "Viết bài mới" },
    { href: "/admin/news-categories/new", label: "Thêm chuyên mục tin tức" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bảng điều khiển</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng quan nội dung website MCBROTHER</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <Icon size={20} />
              </div>
              <div className="mt-4 text-sm text-gray-500">{s.desc}</div>
              <div className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition">
                {s.title}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {s.count.toLocaleString("vi-VN")}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Thao tác nhanh
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-center font-medium hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}