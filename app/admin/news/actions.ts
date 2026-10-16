import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { requireAdmin } from '@/lib/auth';
import { recordSlugChange } from "@/lib/slug-redirect";
/* ================= HELPERS ================= */

function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

function cleanContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "a", "img", "blockquote", "div"],
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt"],
      div: ["class"],
    },
  });
}

function getBool(fd: FormData, key: string) {
  return fd.getAll(key).map(String).pop() === "1";
}

/* ================= CREATE ================= */

export async function createPost(fd: FormData) {

  "use server";
  await requireAdmin();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) throw new Error("Thiếu tiêu đề");

  let slug = String(fd.get("slug") ?? "").trim();
  slug = slug ? toSlug(slug) : toSlug(title);

  const content = cleanContent(String(fd.get("content") ?? ""));
  const plainText = content.replace(/<[^>]+>/g, "").slice(0, 160);

  const metaTitle =
    String(fd.get("metaTitle") ?? "").trim() || title.slice(0, 60);

  const metaDescription =
    String(fd.get("metaDescription") ?? "").trim() || plainText;

  let redirectTarget = "/admin/news?ok=1";

  try {
    let finalSlug = slug;
    let i = 1;

    while (await prisma.post.findFirst({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${i++}`;
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug: finalSlug,
        excerpt: String(fd.get("excerpt") ?? "").trim() || null,
        content,
        coverImage: String(fd.get("coverImage") ?? "").trim() || null,
        tags: parseTags(String(fd.get("tags"))),
        published: getBool(fd, "published"),
        categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : null,
        metaTitle,
        metaDescription,
      },
    });

    revalidatePath("/admin/news");
    revalidatePath(`/tin-tuc/${post.slug}`);
  } catch (e: any) {
    redirectTarget = `/admin/news?err=${encodeURIComponent(e.message)}`;
  }

  redirect(redirectTarget);
}

/* ================= UPDATE ================= */

export async function updatePost(fd: FormData) {
  
  "use server";
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isFinite(id)) throw new Error("ID không hợp lệ");

  const title = String(fd.get("title") ?? "").trim();
  if (!title) throw new Error("Thiếu tiêu đề");

  let slug = String(fd.get("slug") ?? "").trim();
  slug = slug ? toSlug(slug) : toSlug(title);

  const content = cleanContent(String(fd.get("content") ?? ""));
  const plainText = content.replace(/<[^>]+>/g, "").slice(0, 160);

  const metaTitle =
    String(fd.get("metaTitle") ?? "").trim() || title.slice(0, 60);

  const metaDescription =
    String(fd.get("metaDescription") ?? "").trim() || plainText;

  let redirectTarget = "/admin/news?ok=1";

  try {
    let finalSlug = slug;
    let i = 1;

    while (
      await prisma.post.findFirst({
        where: { slug: finalSlug, NOT: { id } },
      })
    ) {
      finalSlug = `${slug}-${i++}`;
    }

    const old = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
    if (!old) throw new Error("Không tìm thấy bài viết");

    await prisma.post.update({
      where: { id },
      data: {
        title,
        slug: finalSlug,
        excerpt: String(fd.get("excerpt") ?? "").trim() || null,
        content,
        coverImage: String(fd.get("coverImage") ?? "").trim() || null,
        tags: parseTags(String(fd.get("tags"))),
        published: getBool(fd, "published"),
        categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : null,
        metaTitle,
        metaDescription,
        canonicalUrl: String(fd.get("canonicalUrl") ?? "").trim() || null,
        ogImage: String(fd.get("ogImage") ?? "").trim() || null,
        noindex: getBool(fd, "noindex"),
        nofollow: getBool(fd, "nofollow"),
      },
    });

    await recordSlugChange("post", old.slug, finalSlug);

    revalidatePath("/admin/news");
    revalidatePath(`/tin-tuc/${finalSlug}`);
    if (old.slug !== finalSlug) revalidatePath(`/tin-tuc/${old.slug}`);
  } catch (e: any) {
    redirectTarget = `/admin/news?err=${encodeURIComponent(e.message)}`;
  }

  redirect(redirectTarget);
}

/* ================= DELETE ================= */

export async function deletePost(fd: FormData) {
  "use server";
  await requireAdmin();

  const id = Number(fd.get("id"));
  if (!Number.isFinite(id)) throw new Error("ID không hợp lệ");

  let redirectTarget = "/admin/news?ok=1";
  try {
    await prisma.post.delete({ where: { id } });
    revalidatePath("/admin/news");
  } catch (e: any) {
    redirectTarget = `/admin/news?err=${encodeURIComponent(e.message)}`;
  }

  redirect(redirectTarget);
}