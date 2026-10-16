'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { recordSlugChange } from '@/lib/slug-redirect';
// Helpers
const asString = (v: FormDataEntryValue | null) => (v ?? '').toString().trim();
const asBool = (v: FormDataEntryValue | null) =>
  v === 'on' || v === 'true' || v === '1';
const asInt = (v: FormDataEntryValue | null) => {
  const s = (v ?? '').toString().trim();
  if (!s) return null;                 // '' -> null
  const n = Number(s);
  return Number.isFinite(n) ? n : null; // "4" -> 4
};
const orNull = (s: string) => (s === '' ? null : s);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export async function createCategory(formData: FormData) {
   await requireAdmin(); 
  const name = asString(formData.get('name'));
  if (!name) throw new Error('Thiếu tên danh mục');

  const slug = asString(formData.get('slug')) || slugify(name);
  const order = asInt(formData.get('order')) ?? 0;
  const parentId = asInt(formData.get('parentId')); // Int | null

  const data = {
    name,
    slug,
    order,
    parentId,

    // SEO & banner (giữ nguyên schema của bạn)
    banner: orNull(asString(formData.get('banner'))),
    metaTitle: orNull(asString(formData.get('metaTitle'))),
    metaDescription: orNull(asString(formData.get('metaDescription'))),
    canonicalUrl: orNull(asString(formData.get('canonicalUrl'))),
    ogImage: orNull(asString(formData.get('ogImage'))),
    noindex: asBool(formData.get('noindex')),
    nofollow: asBool(formData.get('nofollow')),
  };

  await prisma.category.create({ data });
  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function updateCategory(formData: FormData) {
   await requireAdmin(); 
  const id = asInt(formData.get('id'));
  if (!id) throw new Error('Thiếu id danh mục');

  const name = asString(formData.get('name'));
  if (!name) throw new Error('Thiếu tên danh mục');

  const slug = asString(formData.get('slug')) || slugify(name);
  const order = asInt(formData.get('order')) ?? 0;
  let parentId = asInt(formData.get('parentId'));
  if (parentId === id) parentId = null; // tránh tự làm cha chính mình

  const data = {
    name,
    slug,
    order,
    parentId,

    banner: orNull(asString(formData.get('banner'))),
    metaTitle: orNull(asString(formData.get('metaTitle'))),
    metaDescription: orNull(asString(formData.get('metaDescription'))),
    canonicalUrl: orNull(asString(formData.get('canonicalUrl'))),
    ogImage: orNull(asString(formData.get('ogImage'))),
    noindex: asBool(formData.get('noindex')),
    nofollow: asBool(formData.get('nofollow')),
  };

  const old = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!old) throw new Error('Không tìm thấy danh mục');

  await prisma.category.update({ where: { id }, data });
  await recordSlugChange('category', old.slug, slug);

  revalidatePath('/admin/categories');
  revalidatePath(`/${slug}`);
  if (old.slug !== slug) revalidatePath(`/${old.slug}`);
  redirect('/admin/categories');
}

export async function deleteCategory(formData: FormData) {
   await requireAdmin(); 
  const id = asInt(formData.get('id'));
  if (!id) throw new Error('Thiếu id');
  await prisma.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
}