// lib/admin-category.ts
// Lưu / xoá danh mục dùng chung cho Danh mục sản phẩm (category) và Chuyên mục tin (postCategory).
// Chỉ gọi từ server action đã requireAdmin().
import { prisma } from "@/lib/prisma";
import { recordSlugChange } from "@/lib/slug-redirect";
import { slugify } from "@/lib/slug";

export type CatKind = "category" | "postCategory";
export type SaveCatResult = { ok: true; id: number; slug: string; created: boolean } | { ok: false; error: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const orNull = (s: string) => (s === "" ? null : s);
const bool = (fd: FormData, k: string) => ["on", "1", "true"].includes(String(fd.getAll(k).map(String).pop() ?? ""));

const model = (kind: CatKind): any => (kind === "category" ? prisma.category : prisma.postCategory);

/** id của tất cả danh mục con/cháu (để không cho chọn làm danh mục cha → tránh vòng lặp) */
async function descendantIds(kind: CatKind, id: number) {
  const all: { id: number; parentId: number | null }[] = await model(kind).findMany({ select: { id: true, parentId: true } });
  const out = new Set<number>();
  const walk = (p: number) =>
    all.filter((c) => c.parentId === p).forEach((c) => {
      if (!out.has(c.id)) {
        out.add(c.id);
        walk(c.id);
      }
    });
  walk(id);
  return out;
}

export async function saveCategoryGeneric(kind: CatKind, fd: FormData): Promise<SaveCatResult> {
  const id = Number(fd.get("id")) || null;
  const name = str(fd, "name");
  if (!name) return { ok: false, error: "Vui lòng nhập tên." };
  const slug = slugify(str(fd, "slug") || name);
  if (!slug) return { ok: false, error: "Slug không hợp lệ." };

  let parentId = Number(fd.get("parentId")) || null;
  if (id && parentId) {
    if (parentId === id || (await descendantIds(kind, id)).has(parentId)) {
      return { ok: false, error: "Không thể chọn chính nó hoặc danh mục con của nó làm danh mục cha." };
    }
  }

  const data: Record<string, any> = {
    name,
    slug,
    parentId,
    order: Number(fd.get("order")) || 0,
    banner: orNull(str(fd, "banner")),
    metaTitle: orNull(str(fd, "metaTitle")),
    metaDescription: orNull(str(fd, "metaDescription")),
    canonicalUrl: orNull(str(fd, "canonicalUrl")),
    ogImage: orNull(str(fd, "ogImage")),
    noindex: bool(fd, "noindex"),
    nofollow: bool(fd, "nofollow"),
  };
  if (kind === "category") data.isFeatured = bool(fd, "isFeatured");

  try {
    const dup = await model(kind).findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (dup) return { ok: false, error: "Đường dẫn (slug) này đã được dùng. Hãy đổi slug." };

    // Danh mục sản phẩm dùng link /{slug} → không được trùng trang có sẵn
    if (kind === "category" && ["san-pham", "tin-tuc", "lien-he", "gioi-thieu", "tim-kiem", "admin", "api"].includes(slug)) {
      return { ok: false, error: "Slug này trùng với một trang có sẵn của website. Hãy đổi slug." };
    }

    if (!id) {
      const c = await model(kind).create({ data, select: { id: true, slug: true } });
      return { ok: true, id: c.id, slug: c.slug, created: true };
    }
    const old = await model(kind).findUnique({ where: { id }, select: { slug: true } });
    if (!old) return { ok: false, error: "Không tìm thấy (có thể đã bị xoá)." };
    await model(kind).update({ where: { id }, data });
    await recordSlugChange(kind as any, old.slug, slug);
    return { ok: true, id, slug, created: false };
  } catch (e) {
    console.error("SAVE_CATEGORY_ERROR", kind, e);
    return { ok: false, error: "Lưu thất bại, vui lòng thử lại." };
  }
}

/** Xoá danh mục: chỉ khi không còn danh mục con và không còn sản phẩm/bài viết */
export async function deleteCategoryGeneric(kind: CatKind, id: number): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "ID không hợp lệ" };
  const children = await model(kind).count({ where: { parentId: id } });
  const items =
    kind === "category"
      ? await prisma.product.count({ where: { categoryId: id } })
      : await prisma.post.count({ where: { categoryId: id } });
  if (children || items) {
    const what = kind === "category" ? "sản phẩm" : "bài viết";
    return {
      ok: false,
      error: `Chưa xoá được: còn ${children ? `${children} danh mục con` : ""}${children && items ? " và " : ""}${
        items ? `${items} ${what}` : ""
      }. Hãy chuyển chúng sang danh mục khác trước.`,
    };
  }
  try {
    await model(kind).delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    console.error("DELETE_CATEGORY_ERROR", kind, e);
    return { ok: false, error: "Xoá thất bại." };
  }
}
