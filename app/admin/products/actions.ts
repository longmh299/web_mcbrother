'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { recordSlugChange } from '@/lib/slug-redirect';
import { slugify } from '@/lib/slug';

/* ===================== Helpers ===================== */

function asString(v: FormDataEntryValue | null) {
  return (v ?? '').toString().trim();
}
const orNull = (s: string) => (s === '' ? null : s);

function asInt(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).replace(/[^\d-]/g, ''); // chấp nhận "125.000.000"
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function asBool(v: FormDataEntryValue | null) {
  return v === 'on' || v === 'true' || v === '1';
}
function parseJson<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    return v ? (JSON.parse(String(v)) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Chuẩn hoá YouTube → /embed/ (link Cloudinary/khác giữ nguyên) */
function toEmbedUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    }
    return url;
  } catch {
    return url;
  }
}

const clean = (v: unknown) => String(v ?? '').trim();

type Attr = { name: string; value: string };
type Img = { url: string; alt: string };
type Faq = { question: string; answer: string };
type SpecTable = { columns: string[]; rows: { label: string; values: string[] }[] };

function parseAttributes(fd: FormData): Attr[] {
  const raw = parseJson<any[]>(fd.get('attributes'), []);
  return (Array.isArray(raw) ? raw : [])
    .map((a) => ({ name: clean(a?.name), value: clean(a?.value) }))
    .filter((a) => a.name && a.value);
}
function parseImages(fd: FormData): Img[] {
  const raw = parseJson<any[]>(fd.get('images'), []);
  return (Array.isArray(raw) ? raw : [])
    .map((im) => ({ url: clean(im?.url), alt: clean(im?.alt) }))
    .filter((im) => im.url);
}
function parseFaqs(fd: FormData): Faq[] {
  const raw = parseJson<any[]>(fd.get('faqs'), []);
  return (Array.isArray(raw) ? raw : [])
    .map((f) => ({ question: clean(f?.question), answer: clean(f?.answer) }))
    .filter((f) => f.question && f.answer);
}
/** Bảng thông số theo model. Không có dòng nào → null (trang SP sẽ không hiện bảng trống). */
function parseSpecTable(fd: FormData): SpecTable | null {
  const raw = parseJson<any>(fd.get('specTable'), null);
  if (!raw || typeof raw !== 'object') return null;
  const allCols: string[] = (Array.isArray(raw.columns) ? raw.columns : []).map(clean);
  const allRows = (Array.isArray(raw.rows) ? raw.rows : []).map((r: any) => ({
    label: clean(r?.label),
    values: allCols.map((_, i) => clean(r?.values?.[i])),
  }));
  // Bỏ cột trống hoàn toàn (không tên model, không giá trị)
  const keep = allCols
    .map((c, i) => (c || allRows.some((r: any) => r.values[i]) ? i : -1))
    .filter((i) => i >= 0);
  const columns = keep.map((i) => allCols[i]);
  const rows = allRows
    .map((r: any) => ({ label: r.label, values: keep.map((i) => r.values[i]) }))
    .filter((r: any) => r.label || r.values.some(Boolean));
  if (!columns.length || !rows.length) return null;
  return { columns, rows };
}

function readProduct(fd: FormData) {
  const name = asString(fd.get('name'));
  const slug = slugify(asString(fd.get('slug')) || name);
  return {
    name,
    slug,
    short: asString(fd.get('short')),
    description: asString(fd.get('description')),
    sku: orNull(asString(fd.get('sku'))),
    price: asInt(fd.get('price')),
    coverImage: orNull(asString(fd.get('coverImage'))),
    videoUrl: toEmbedUrl(orNull(asString(fd.get('videoUrl')))),
    published: asBool(fd.get('published')),
    isFeatured: asBool(fd.get('isFeatured')),
    power: orNull(asString(fd.get('power'))),
    voltage: orNull(asString(fd.get('voltage'))),
    weight: orNull(asString(fd.get('weight'))),
    dimensions: orNull(asString(fd.get('dimensions'))),
    functions: orNull(asString(fd.get('functions'))),
    material: orNull(asString(fd.get('material'))),
    warranty: orNull(asString(fd.get('warranty'))),
    metaTitle: orNull(asString(fd.get('metaTitle'))),
    metaDescription: orNull(asString(fd.get('metaDescription'))),
    canonicalUrl: orNull(asString(fd.get('canonicalUrl'))),
    ogImage: orNull(asString(fd.get('ogImage'))),
    noindex: asBool(fd.get('noindex')),
    nofollow: asBool(fd.get('nofollow')),
    categoryId: asInt(fd.get('categoryId')),
    specTable: parseSpecTable(fd) as any,
    faqs: parseFaqs(fd) as any,
  };
}

/** Lỗi trùng slug/SKU (Prisma P2002) → thông báo dễ hiểu */
function friendlyError(e: any) {
  if (e?.code === 'P2002') {
    const target = String(e?.meta?.target ?? '');
    if (target.includes('sku')) return 'Mã SKU này đã được dùng cho sản phẩm khác.';
    return 'Đường dẫn (slug) này đã được dùng cho sản phẩm khác. Hãy đổi slug.';
  }
  console.error('SAVE_PRODUCT_ERROR', e);
  return 'Lưu thất bại, vui lòng thử lại.';
}

function revalidateProduct(slug: string, oldSlug?: string) {
  revalidatePath('/admin/products');
  revalidatePath('/san-pham');
  revalidatePath('/');
  revalidatePath(`/san-pham/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/san-pham/${oldSlug}`);
}

/* ===================== Lưu sản phẩm (tạo mới + sửa) ===================== */

export type SaveResult =
  | { ok: true; id: number; slug: string; created: boolean }
  | { ok: false; error: string };

/**
 * Dùng chung cho form Thêm & Sửa. Có `id` → sửa, không có → tạo mới.
 * Trả kết quả về form (không redirect) để hiện thông báo "Đã lưu" và ở lại trang.
 */
export async function saveProduct(formData: FormData): Promise<SaveResult> {
  await requireAdmin();

  const id = asInt(formData.get('id'));
  const data = readProduct(formData);
  if (!data.name) return { ok: false, error: 'Vui lòng nhập tên sản phẩm.' };
  if (!data.slug) return { ok: false, error: 'Slug không hợp lệ.' };

  const attributes = parseAttributes(formData);
  const images = parseImages(formData);
  const attrCreate = attributes.map((a, i) => ({ name: a.name, value: a.value, sort: i }));
  const imgCreate = images.map((im, i) => ({ url: im.url, alt: im.alt || null, sort: i }));

  try {
    if (!id) {
      const created = await prisma.product.create({
        data: { ...data, attributes: { create: attrCreate }, images: { create: imgCreate } },
        select: { id: true, slug: true },
      });
      revalidateProduct(created.slug);
      return { ok: true, id: created.id, slug: created.slug, created: true };
    }

    const old = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!old) return { ok: false, error: 'Không tìm thấy sản phẩm (có thể đã bị xoá).' };

    await prisma.product.update({
      where: { id },
      data: {
        ...data,
        // Xoá hết rồi tạo lại theo danh sách mới nhất (đơn giản, luôn đồng bộ đúng thứ tự)
        attributes: { deleteMany: {}, create: attrCreate },
        images: { deleteMany: {}, create: imgCreate },
      },
    });

    await recordSlugChange('product', old.slug, data.slug);
    revalidateProduct(data.slug, old.slug);
    return { ok: true, id, slug: data.slug, created: false };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

/* ===================== Xoá & thao tác nhanh ===================== */

/**
 * Xoá sản phẩm kèm ảnh thư viện + thông số.
 * DB đang để khoá ngoại ON DELETE RESTRICT → phải xoá bảng con trước, nếu không sẽ lỗi.
 */
async function deleteProductsWithChildren(ids: number[]) {
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: { in: ids } } }),
    prisma.productAttribute.deleteMany({ where: { productId: { in: ids } } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = asInt(formData.get('id'));
  if (!id) throw new Error('Thiếu id');
  await deleteProductsWithChildren([id]);
  revalidatePath('/admin/products');
  revalidatePath('/san-pham');
}

/** Bật/tắt nhanh "Hiển thị" hoặc "Nổi bật" ngay trên danh sách */
export async function toggleProductFlag(formData: FormData) {
  await requireAdmin();
  const id = asInt(formData.get('id'));
  const field = asString(formData.get('field'));
  if (!id || (field !== 'published' && field !== 'isFeatured')) return;
  const value = asBool(formData.get('value'));
  await prisma.product.update({ where: { id }, data: { [field]: value } });
  revalidatePath('/admin/products');
  revalidatePath('/san-pham');
  revalidatePath('/');
}

/** Thao tác hàng loạt trên các sản phẩm đã chọn */
export async function bulkProductOp(formData: FormData) {
  await requireAdmin();
  const op = asString(formData.get('op'));
  const ids = formData
    .getAll('ids')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return;

  const where = { id: { in: ids } };
  if (op === 'publish') await prisma.product.updateMany({ where, data: { published: true } });
  else if (op === 'unpublish') await prisma.product.updateMany({ where, data: { published: false } });
  else if (op === 'feature') await prisma.product.updateMany({ where, data: { isFeatured: true } });
  else if (op === 'unfeature') await prisma.product.updateMany({ where, data: { isFeatured: false } });
  else if (op === 'delete') await deleteProductsWithChildren(ids);

  revalidatePath('/admin/products');
  revalidatePath('/san-pham');
  revalidatePath('/');
}
