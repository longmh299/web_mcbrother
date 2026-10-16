// app/admin/news-categories/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import CategoryList from "@/components/admin/CategoryList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Chuyên mục tin tức" };

export default async function Page() {
  const items = await prisma.postCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      order: true,
      banner: true,
      noindex: true,
      
      _count: { select: { posts: true } },
    },
  });
  const back = { href: "/admin/news", label: "Bài viết" };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Chuyên mục tin tức</h1>
          <p className="text-sm text-slate-500">
            {items.length} chuyên mục · bấm <Plus size={12} className="inline" /> trên một dòng để thêm chuyên mục con
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={back.href} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {back.label}
          </Link>
          <Link
            href="/admin/news-categories/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Thêm chuyên mục
          </Link>
        </div>
      </div>

      <CategoryList
        kind="post"
        rows={items.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId,
          order: c.order,
          banner: c.banner,
          noindex: c.noindex,
          isFeatured: false,
          count: c._count.posts,
        }))}
      />
    </div>
  );
}
