'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export type SeoPatch = { metaTitle?: string; metaDescription?: string; short?: string };

const clean = (v: unknown, max: number) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

/** Lưu nhanh Tiêu đề SEO / Mô tả SEO / Mô tả ngắn từ trang Kiểm tra SEO */
export async function applySeo(kind: 'product' | 'post', id: number, patch: SeoPatch): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'ID không hợp lệ' };

  const data: Record<string, string | null> = {};
  if ('metaTitle' in patch) data.metaTitle = clean(patch.metaTitle, 120);
  if ('metaDescription' in patch) data.metaDescription = clean(patch.metaDescription, 320);
  if ('short' in patch) {
    if (kind === 'product') data.short = clean(patch.short, 2000);
    else data.excerpt = clean(patch.short, 1000);
  }
  if (!Object.keys(data).length) return { ok: true };

  try {
    if (kind === 'product') {
      const p = await prisma.product.update({ where: { id }, data, select: { slug: true } });
      revalidatePath(`/san-pham/${p.slug}`);
    } else {
      const p = await prisma.post.update({ where: { id }, data, select: { slug: true } });
      revalidatePath(`/tin-tuc/${p.slug}`);
    }
    revalidatePath('/admin/seo');
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) {
    console.error('APPLY_SEO_ERROR', e);
    return { ok: false, error: 'Lưu thất bại' };
  }
}
