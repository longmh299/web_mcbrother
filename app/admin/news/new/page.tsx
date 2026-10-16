// app/admin/news/new/page.tsx
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import PostForm from "@/components/admin/PostForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const cats = await prisma.postCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });

  return (
    <PostForm
      siteUrl={SITE_URL}
      categories={cats}
      initial={{
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        coverImage: "",
        tags: [],
        published: true,
        categoryId: null,
        metaTitle: "",
        metaDescription: "",
        canonicalUrl: "",
        ogImage: "",
        noindex: false,
        nofollow: false,
      }}
    />
  );
}
