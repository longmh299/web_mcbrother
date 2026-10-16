'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { deleteCategoryGeneric, saveCategoryGeneric, type SaveCatResult } from '@/lib/admin-category';

function revalidateAll() {
  revalidatePath('/admin/news-categories');
  revalidatePath('/admin/news');
  revalidatePath('/tin-tuc');
}

/** Thêm / sửa chuyên mục tin tức (có id → sửa) */
export async function savePostCategory(formData: FormData): Promise<SaveCatResult> {
  await requireAdmin();
  const res = await saveCategoryGeneric('postCategory', formData);
  if (res.ok) revalidateAll();
  return res;
}

export async function deletePostCategory(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const res = await deleteCategoryGeneric('postCategory', Number(formData.get('id')));
  if (res.ok) revalidateAll();
  return res;
}
