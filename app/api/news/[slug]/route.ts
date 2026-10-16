// app/api/news/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  // Next 15+: params là Promise
  const { slug: rawSlug } = await context.params;
  const slug = String(rawSlug || "");

  const p = await prisma.post.findUnique({
    where: { slug },
    include: { category: true },
  });

  // Không thấy / chưa public / noindex → thử redirect slug, nếu không có thì 404
  if (!p || !p.published || p.noindex) {
    try {
      const r = await prisma.slugRedirect.findUnique({
        where: { fromSlug: slug },
      });
      if (r?.entityType === "post" && r.toSlug) {
        return NextResponse.redirect(new URL(`/tin-tuc/${r.toSlug}`, req.url), 308);
      }
    } catch {
      // nếu dự án không có bảng slugRedirect thì bỏ qua
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    tags: p.tags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    category: p.category
      ? { id: p.category.id, slug: p.category.slug, name: p.category.name }
      : null,
    seo: {
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      canonicalUrl: p.canonicalUrl,
      ogImage: p.ogImage,
      noindex: p.noindex,
      nofollow: p.nofollow,
    },
  });
}
