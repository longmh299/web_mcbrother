// app/admin/products/page.tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ProductTable from "@/components/admin/ProductTable";
import ListToolbar from "@/components/admin/ListToolbar";
import Pagination from "@/components/admin/Pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sản phẩm" };

type SearchParams = { q?: string; page?: string; cat?: string; status?: string };

const PER_PAGE = 20;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q = "", page = "1", cat = "", status = "" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);

  // Điều kiện tìm kiếm + danh mục (dùng chung cho đếm số ở các tab)
  const base: any = {};
  if (q) {
    base.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  if (cat === "none") base.categoryId = null;
  else if (Number(cat)) base.categoryId = Number(cat);

  const STATUS: Record<string, any> = {
    "": {},
    published: { published: true },
    draft: { published: false },
    featured: { isFeatured: true },
  };
  const where = { ...base, ...(STATUS[status] ?? {}) };

  const [items, total, categories, ...counts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: PER_PAGE,
      skip: (current - 1) * PER_PAGE,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        coverImage: true,
        published: true,
        isFeatured: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    ...Object.values(STATUS).map((w) => prisma.product.count({ where: { ...base, ...w } })),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const tabs = [
    { key: "", label: "Tất cả" },
    { key: "published", label: "Đang hiển thị" },
    { key: "draft", label: "Đang ẩn" },
    { key: "featured", label: "Nổi bật" },
  ].map((t, i) => ({ ...t, count: counts[i] as number }));

  const tabHref = (key: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    if (key) sp.set("status", key);
    return `/admin/products${sp.toString() ? `?${sp}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sản phẩm</h1>
          <p className="text-sm text-slate-500">{counts[0]?.toLocaleString("vi-VN")} sản phẩm</p>
        </div>
        <Link
          href={`/admin/products/new${Number(cat) ? `?cat=${cat}` : ""}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Thêm sản phẩm
        </Link>
      </div>

      {/* Tab trạng thái */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const active = status === t.key || (!status && !t.key);
          return (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-2 text-xs ${active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <ListToolbar
        searchPlaceholder="Tìm tên, mã SKU, slug…"
        selects={[
          {
            name: "cat",
            placeholder: "Tất cả danh mục",
            options: [...categories.map((c) => ({ value: String(c.id), label: c.name })), { value: "none", label: "— Chưa có danh mục —" }],
          },
        ]}
      />

      <ProductTable
        rows={items.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          price: p.price,
          coverImage: p.coverImage,
          published: p.published,
          isFeatured: p.isFeatured,
          updatedAt: new Date(p.updatedAt).toISOString(),
          category: p.category?.name ?? null,
        }))}
      />

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-sm text-slate-500">
          {total > 0
            ? `Hiển thị ${(current - 1) * PER_PAGE + 1}–${Math.min(current * PER_PAGE, total)} / ${total}`
            : ""}
        </p>
        <Pagination basePath="/admin/products" params={{ q, cat, status }} page={current} pages={pages} />
      </div>
    </div>
  );
}
