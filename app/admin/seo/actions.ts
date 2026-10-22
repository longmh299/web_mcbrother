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

export type FaqItem = { question: string; answer: string };

/** Thêm FAQ vào sản phẩm (nối tiếp FAQ đang có, bỏ câu trùng / trống) */
export async function addProductFaqs(id: number, items: FaqItem[]): Promise<{ ok: boolean; error?: string; total?: number }> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'ID không hợp lệ' };
  const clean = (Array.isArray(items) ? items : [])
    .map((f) => ({ question: String(f?.question ?? '').trim().slice(0, 300), answer: String(f?.answer ?? '').trim().slice(0, 1500) }))
    .filter((f) => f.question && f.answer);
  if (!clean.length) return { ok: false, error: 'Không có câu hỏi nào hợp lệ' };

  try {
    const p = await prisma.product.findUnique({ where: { id }, select: { slug: true, faqs: true } });
    if (!p) return { ok: false, error: 'Không tìm thấy sản phẩm' };
    const old: FaqItem[] = (Array.isArray(p.faqs) ? (p.faqs as any[]) : [])
      .map((f) => ({ question: String(f?.question ?? '').trim(), answer: String(f?.answer ?? '').trim() }))
      .filter((f) => f.question && f.answer);
    const seen = new Set(old.map((f) => f.question.toLowerCase()));
    const merged = [...old, ...clean.filter((f) => !seen.has(f.question.toLowerCase()))].slice(0, 20);

    await prisma.product.update({ where: { id }, data: { faqs: merged as any } });
    revalidatePath(`/san-pham/${p.slug}`);
    revalidatePath('/admin/seo');
    revalidatePath('/admin');
    return { ok: true, total: merged.length };
  } catch (e) {
    console.error('ADD_FAQ_ERROR', e);
    return { ok: false, error: 'Lưu FAQ thất bại' };
  }
}
