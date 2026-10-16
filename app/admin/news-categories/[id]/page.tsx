// app/admin/news-categories/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import CategoryForm from "@/components/admin/CategoryForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s = (v: string | null | undefined) => v ?? "";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catId = Number(id);
  if (!Number.isInteger(catId) || catId <= 0) notFound();

  const [c, all] = await Promise.all([
    prisma.postCategory.findUnique({ where: { id: catId }, include: { _count: { select: { posts: true } } } }),
    prisma.postCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } }),
  ]);

  if (!c) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Không tìm thấy chuyên mục</h1>
        <Link href="/admin/news-categories" className="text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <CategoryForm
      key={c.id}
      kind="post"
      all={all}
      siteUrl={SITE_URL}
      initial={{
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        order: c.order ?? 0,
        isFeatured: false,
        banner: s(c.banner),
        metaTitle: s(c.metaTitle),
        metaDescription: s(c.metaDescription),
        canonicalUrl: s(c.canonicalUrl),
        ogImage: s(c.ogImage),
        noindex: c.noindex,
        nofollow: c.nofollow,
        itemCount: c._count.posts,
      }}
    />
  );
}
