// app/admin/products/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import ProductForm, { type ProductFormData } from "@/components/admin/ProductForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const s = (v: string | null | undefined) => v ?? "";

export default async function EditProductPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [p, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        attributes: { select: { name: true, value: true }, orderBy: { sort: "asc" } },
        images: { select: { url: true, alt: true }, orderBy: { sort: "asc" } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  if (!p) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Không tìm thấy sản phẩm</h1>
        <Link href="/admin/products" className="text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const spec = p.specTable as ProductFormData["specTable"];
  const initial: ProductFormData = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: s(p.sku),
    price: p.price,
    categoryId: p.categoryId,
    short: s(p.short),
    description: s(p.description),
    coverImage: s(p.coverImage),
    images: p.images.map((im) => ({ url: im.url, alt: s(im.alt) })),
    videoUrl: s(p.videoUrl),
    published: p.published,
    isFeatured: p.isFeatured,
    power: s(p.power),
    voltage: s(p.voltage),
    weight: s(p.weight),
    dimensions: s(p.dimensions),
    functions: s(p.functions),
    material: s(p.material),
    warranty: s(p.warranty),
    attributes: p.attributes,
    specTable: spec && Array.isArray(spec.columns) ? spec : null,
    faqs: Array.isArray(p.faqs) ? (p.faqs as ProductFormData["faqs"]) : [],
    metaTitle: s(p.metaTitle),
    metaDescription: s(p.metaDescription),
    canonicalUrl: s(p.canonicalUrl),
    ogImage: s(p.ogImage),
    noindex: p.noindex,
    nofollow: p.nofollow,
  };

  // key: đổi sản phẩm → form khởi tạo lại từ đầu
  return <ProductForm key={p.id} initial={initial} categories={categories} siteUrl={SITE_URL} />;
}
