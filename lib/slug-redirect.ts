// lib/slug-redirect.ts
// Ghi lại slug cũ → slug mới khi đổi slug, để link cũ (Google, Facebook, bài viết khác…)
// tự chuyển 301 sang trang mới thay vì 404.
import { prisma } from "@/lib/prisma";
import type { EntityType } from "@prisma/client";

/**
 * Gọi SAU khi đã update thành công, nếu slug thay đổi.
 * - Tạo redirect oldSlug → newSlug
 * - Gộp chuỗi: các redirect cũ đang trỏ về oldSlug sẽ trỏ thẳng newSlug (tránh A→B→C)
 * - Xoá redirect có fromSlug = newSlug (slug đó giờ đã là trang thật)
 * Lỗi ở đây không được làm hỏng thao tác lưu chính → chỉ log.
 */
export async function recordSlugChange(entityType: EntityType, oldSlug: string, newSlug: string) {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  try {
    await prisma.$transaction([
      prisma.slugRedirect.deleteMany({ where: { fromSlug: newSlug } }),
      prisma.slugRedirect.updateMany({
        where: { entityType, toSlug: oldSlug },
        data: { toSlug: newSlug },
      }),
      prisma.slugRedirect.upsert({
        where: { fromSlug: oldSlug },
        create: { entityType, fromSlug: oldSlug, toSlug: newSlug },
        update: { entityType, toSlug: newSlug },
      }),
    ]);
  } catch (e) {
    console.error("SLUG_REDIRECT_ERROR", entityType, oldSlug, "→", newSlug, e);
  }
}

/** Tìm slug mới cho một slug cũ (đúng loại entity). Không có → null. */
export async function findRedirect(entityType: EntityType, slug: string) {
  try {
    const r = await prisma.slugRedirect.findUnique({ where: { fromSlug: slug } });
    return r && r.entityType === entityType && r.toSlug ? r.toSlug : null;
  } catch {
    return null;
  }
}