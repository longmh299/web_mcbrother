// app/admin/categories/new/page.tsx
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import CategoryForm from "@/components/admin/CategoryForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const { parent } = await searchParams;
  const all = await prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true } });
  // ?parent=3 → chọn sẵn danh mục cha
  const parentId = all.some((c) => c.id === Number(parent)) ? Number(parent) : null;

  return (
    <CategoryForm
      kind="product"
      all={all}
      siteUrl={SITE_URL}
      initial={{
        name: "",
        slug: "",
        parentId,
        order: 0,
        isFeatured: false,
        banner: "",
        metaTitle: "",
        metaDescription: "",
        canonicalUrl: "",
        ogImage: "",
        noindex: false,
        nofollow: false,
      }}
    />
  );
}
