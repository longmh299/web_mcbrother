'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { recordSlugChange } from '@/lib/slug-redirect';
import { sanitizeHtml } from '@/lib/sanitize';
import { slugify } from '@/lib/slug';

/* ================= HELPERS ================= */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const orNull = (s: string) => (s === '' ? null : s);
const bool = (fd: FormData, k: string) => {
  const v = fd.getAll(k).map(String).pop();
  return v === '1' || v === 'on' || v === 'true';
};

function parseTags(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30);
}

function revalidatePost(slug: string, oldSlug?: string) {
  revalidatePath('/admin/news');
  revalidatePath('/tin-tuc');
  revalidatePath('/');
  revalidatePath(`/tin-tuc/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/tin-tuc/${oldSlug}`);
}

/* ================= LƯU BÀI (tạo mới + sửa) ================= */

export type SavePostResult =
  | { ok: true; id: number; slug: string; created: boolean }
  | { ok: false; error: string };

/**
 * Dùng chung cho form Viết bài & Sửa bài. Có `id` → sửa, không có → tạo mới.
 * Trả kết quả về form (không redirect) để hiện "Đã lưu" và ở lại trang.
 */
export async function savePost(fd: FormData): Promise<SavePostResult> {
  await requireAdmin();

  const id = Number(fd.get('id')) || null;
  const title = str(fd, 'title');
  if (!title) return { ok: false, error: 'Vui lòng nhập tiêu đề bài viết.' };

  const slug = slugify(str(fd, 'slug') || title).slice(0, 160);
  if (!slug) return { ok: false, error: 'Slug không hợp lệ.' };

  // Lọc HTML: giữ bảng, ảnh, video nhúng (YouTube…), bỏ script/style lạ
  const content = sanitizeHtml(str(fd, 'content'), { allowStyle: false });
  const categoryId = Number(fd.get('categoryId')) || null;

  const data = {
    title,
    slug,
    excerpt: orNull(str(fd, 'excerpt')),
    content,
    coverImage: orNull(str(fd, 'coverImage')),
    tags: parseTags(str(fd, 'tags')),
    published: bool(fd, 'published'),
    categoryId,
    // Để trống → trang bài viết tự lấy tiêu đề / mô tả ngắn
    metaTitle: orNull(str(fd, 'metaTitle')),
    metaDescription: orNull(str(fd, 'metaDescription')),
    canonicalUrl: orNull(str(fd, 'canonicalUrl')),
    ogImage: orNull(str(fd, 'ogImage')),
    noindex: bool(fd, 'noindex'),
    nofollow: bool(fd, 'nofollow'),
  };

  try {
    // Slug trùng với bài khác → báo lỗi rõ ràng (không tự thêm -1, -2 gây khó hiểu)
    const dup = await prisma.post.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (dup) return { ok: false, error: 'Đường dẫn (slug) này đã được dùng cho bài khác. Hãy đổi slug.' };

    if (!id) {
      const created = await prisma.post.create({ data, select: { id: true, slug: true } });
      revalidatePost(created.slug);
      return { ok: true, id: created.id, slug: created.slug, created: true };
    }

    const old = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
    if (!old) return { ok: false, error: 'Không tìm thấy bài viết (có thể đã bị xoá).' };

    await prisma.post.update({ where: { id }, data });
    await recordSlugChange('post', old.slug, slug);
    revalidatePost(slug, old.slug);
    return { ok: true, id, slug, created: false };
  } catch (e) {
    console.error('SAVE_POST_ERROR', e);
    return { ok: false, error: 'Lưu thất bại, vui lòng thử lại.' };
  }
}

/* ================= XOÁ & THAO TÁC NHANH ================= */

export async function deletePost(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  if (!Number.isInteger(id) || id <= 0) return;
  await prisma.post.delete({ where: { id } });
  revalidatePath('/admin/news');
  revalidatePath('/tin-tuc');
  revalidatePath('/');
}

/** Bật/tắt hiển thị ngay trên danh sách */
export async function togglePostPublished(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get('id'));
  if (!Number.isInteger(id) || id <= 0) return;
  await prisma.post.update({ where: { id }, data: { published: bool(fd, 'value') } });
  revalidatePath('/admin/news');
  revalidatePath('/tin-tuc');
  revalidatePath('/');
}

export async function bulkPostOp(fd: FormData) {
  await requireAdmin();
  const op = str(fd, 'op');
  const ids = fd
    .getAll('ids')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return;

  const where = { id: { in: ids } };
  if (op === 'publish') await prisma.post.updateMany({ where, data: { published: true } });
  else if (op === 'unpublish') await prisma.post.updateMany({ where, data: { published: false } });
  else if (op === 'delete') await prisma.post.deleteMany({ where });

  revalidatePath('/admin/news');
  revalidatePath('/tin-tuc');
  revalidatePath('/');
}
