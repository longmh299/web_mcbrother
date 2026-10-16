// app/admin/products/new/page.tsx
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import ProductForm, { type ProductFormData } from "@/components/admin/ProductForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: ProductFormData = {
  name: "",
  slug: "",
  sku: "",
  price: null,
  categoryId: null,
  short: "",
  description: "",
  coverImage: "",
  images: [],
  videoUrl: "",
  published: true,
  isFeatured: false,
  power: "",
  voltage: "",
  weight: "",
  dimensions: "",
  functions: "",
  material: "",
  warranty: "12 tháng",
  attributes: [],
  specTable: null,
  faqs: [],
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImage: "",
  noindex: false,
  nofollow: false,
};

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  // /admin/products/new?cat=3 → chọn sẵn danh mục
  const categoryId = categories.some((c) => c.id === Number(cat)) ? Number(cat) : null;

  return <ProductForm initial={{ ...EMPTY, categoryId }} categories={categories} siteUrl={SITE_URL} />;
}
