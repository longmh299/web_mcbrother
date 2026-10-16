// app/api/admin/news/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { denyIfNotAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 96);

const toBoolUndef = (v: unknown) =>
  v === undefined
    ? undefined
    : typeof v === "boolean"
    ? v
    : String(v).trim() === "true" || v === 1 || v === "1";

const toTagsUndef = (v: unknown) => {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
    }

    const old = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
    if (!old) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as any;

    const data = {
      title: body.title ?? undefined,
      slug: body.slug ? slugify(String(body.slug)) : undefined,
      excerpt: body.excerpt ?? undefined,
      content: body.content ?? undefined,
      coverImage: body.coverImage ?? undefined,
      tags: toTagsUndef(body.tags),
      published: toBoolUndef(body.published),
      // coerce categoryId
      categoryId:
        body.categoryId === null || body.categoryId === ""
          ? null
          : body.categoryId !== undefined
          ? Number(body.categoryId)
          : undefined,

      metaTitle: body.metaTitle ?? undefined,
      metaDescription: body.metaDescription ?? undefined,
      canonicalUrl: body.canonicalUrl ?? undefined,
      ogImage: body.ogImage ?? undefined,
      noindex: toBoolUndef(body.noindex),
      nofollow: toBoolUndef(body.nofollow),
    } as const;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id },
        data,
        select: { id: true, slug: true },
      });

      if (old.slug !== updated.slug) {
        await tx.slugRedirect
          .create({
            data: { entityType: "post", fromSlug: old.slug, toSlug: updated.slug },
          })
          .catch(() => {});
      }
      return updated;
    });

    const res = NextResponse.json({ ok: true, post: result });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("PUT /api/admin/news/:id error", e);
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
    }
    await prisma.post.delete({ where: { id } });
    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("DELETE /api/admin/news/:id error", e);
    return NextResponse.json({ ok: false, message: "Internal error" }, { status: 500 });
  }
}