'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { deleteCategoryGeneric, saveCategoryGeneric, type SaveCatResult } from '@/lib/admin-category';

function revalidateAll(slug?: string) {
  revalidatePath('/admin/categories');
  revalidatePath('/san-pham');
  revalidatePath('/', 'layout'); // menu danh mục ở header/footer + trang chủ
  if (slug) revalidatePath(`/${slug}`);
}

/** Thêm / sửa danh mục sản phẩm (có id → sửa) */
export async function saveCategory(formData: FormData): Promise<SaveCatResult> {
  await requireAdmin();
  const res = await saveCategoryGeneric('category', formData);
  if (res.ok) revalidateAll(res.slug);
  return res;
}

export async function deleteCategory(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const res = await deleteCategoryGeneric('category', Number(formData.get('id')));
  if (res.ok) revalidateAll();
  return res;
}
