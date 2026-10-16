// app/admin/news/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import PostForm from "@/components/admin/PostForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const s = (v: string | null | undefined) => v ?? "";

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  const [post, cats] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.postCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  if (!post) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Không tìm thấy bài viết</h1>
        <Link href="/admin/news" className="text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <PostForm
      key={post.id}
      siteUrl={SITE_URL}
      categories={cats}
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: s(post.excerpt),
        content: s(post.content),
        coverImage: s(post.coverImage),
        tags: post.tags ?? [],
        published: post.published,
        categoryId: post.categoryId,
        metaTitle: s(post.metaTitle),
        metaDescription: s(post.metaDescription),
        canonicalUrl: s(post.canonicalUrl),
        ogImage: s(post.ogImage),
        noindex: post.noindex,
        nofollow: post.nofollow,
        createdAt: new Date(post.createdAt).toISOString(),
        updatedAt: new Date(post.updatedAt).toISOString(),
      }}
    />
  );
}
