// app/admin/news/page.tsx
import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PostTable from "@/components/admin/PostTable";
import ListToolbar from "@/components/admin/ListToolbar";
import Pagination from "@/components/admin/Pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tin tức" };

type SearchParams = { q?: string; page?: string; cat?: string; status?: string };
const PER_PAGE = 20;

export default async function NewsList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = "", page = "1", cat = "", status = "" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);

  const base: any = {};
  if (q) {
    base.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  if (cat === "none") base.categoryId = null;
  else if (Number(cat)) base.categoryId = Number(cat);

  const STATUS: Record<string, any> = { "": {}, published: { published: true }, draft: { published: false } };
  const where = { ...base, ...(STATUS[status] ?? {}) };

  const [items, total, cats, ...counts] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: PER_PAGE,
      skip: (current - 1) * PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.post.count({ where }),
    prisma.postCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    ...Object.values(STATUS).map((w) => prisma.post.count({ where: { ...base, ...w } })),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const tabs = [
    { key: "", label: "Tất cả" },
    { key: "published", label: "Đã đăng" },
    { key: "draft", label: "Bản nháp" },
  ].map((t, i) => ({ ...t, count: counts[i] as number }));
  const tabHref = (key: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    if (key) sp.set("status", key);
    return `/admin/news${sp.toString() ? `?${sp}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tin tức</h1>
          <p className="text-sm text-slate-500">{counts[0]?.toLocaleString("vi-VN")} bài viết</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/news-categories"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Tags size={16} /> Chuyên mục
          </Link>
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Viết bài mới
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const active = status === t.key || (!status && !t.key);
          return (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 text-xs ${active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
            </Link>
          );
        })}
      </div>

      <ListToolbar
        searchPlaceholder="Tìm tiêu đề, tag…"
        selects={[
          {
            name: "cat",
            placeholder: "Tất cả chuyên mục",
            options: [...cats.map((c) => ({ value: String(c.id), label: c.name })), { value: "none", label: "— Chưa có chuyên mục —" }],
          },
        ]}
      />

      <PostTable
        rows={items.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          coverImage: p.coverImage,
          published: p.published,
          createdAt: new Date(p.createdAt).toISOString(),
          updatedAt: new Date(p.updatedAt).toISOString(),
          category: p.category?.name ?? null,
        }))}
      />

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-sm text-slate-500">
          {total > 0 ? `Hiển thị ${(current - 1) * PER_PAGE + 1}–${Math.min(current * PER_PAGE, total)} / ${total}` : ""}
        </p>
        <Pagination basePath="/admin/news" params={{ q, cat, status }} page={current} pages={pages} />
      </div>
    </div>
  );
}
