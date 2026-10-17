// app/admin/seo/page.tsx
// Kiểm tra SEO toàn bộ sản phẩm / bài viết đang hiển thị.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auditAll, stripHtml, type SeoInput } from "@/lib/seo-audit";
import SeoBoard, { type SeoRow } from "@/components/admin/SeoBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kiểm tra SEO" };

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ kind?: string; issue?: string }> }) {
  const { kind: k, issue } = await searchParams;
  const kind = k === "post" ? "post" : "product";

  const [products, posts] = await Promise.all([
    kind === "product"
      ? prisma.product.findMany({
          where: { published: true },
          select: {
            id: true, name: true, slug: true, metaTitle: true, metaDescription: true, short: true, description: true,
            coverImage: true, faqs: true, noindex: true, power: true, voltage: true, dimensions: true, material: true,
            category: { select: { name: true } },
          },
        })
      : [],
    kind === "post"
      ? prisma.post.findMany({
          where: { published: true },
          select: {
            id: true, title: true, slug: true, metaTitle: true, metaDescription: true, excerpt: true, content: true,
            coverImage: true, noindex: true, category: { select: { name: true } },
          },
        })
      : [],
  ]);
  const [productCount, postCount] = await Promise.all([
    prisma.product.count({ where: { published: true } }),
    prisma.post.count({ where: { published: true } }),
  ]);

  const inputs: (SeoInput & { extra: Partial<SeoRow> })[] =
    kind === "product"
      ? products.map((p: any) => ({
          id: p.id, kind: "product", name: p.name, slug: p.slug, metaTitle: p.metaTitle, metaDescription: p.metaDescription,
          short: p.short, content: p.description, coverImage: p.coverImage, categoryName: p.category?.name ?? null,
          faqCount: Array.isArray(p.faqs) ? p.faqs.filter((f: any) => f?.question && f?.answer).length : 0,
          noindex: p.noindex,
          extra: {
            editHref: `/admin/products/${p.id}/edit`,
            publicHref: `/san-pham/${p.slug}`,
            specs: [p.power && `Công suất ${p.power}`, p.voltage && `Điện áp ${p.voltage}`, p.dimensions && `Kích thước ${p.dimensions}`, p.material && `Vật liệu ${p.material}`]
              .filter(Boolean)
              .join("; "),
          },
        }))
      : posts.map((p: any) => ({
          id: p.id, kind: "post", name: p.title, slug: p.slug, metaTitle: p.metaTitle, metaDescription: p.metaDescription,
          short: p.excerpt, content: p.content, coverImage: p.coverImage, categoryName: p.category?.name ?? null,
          faqCount: 0, noindex: p.noindex,
          extra: { editHref: `/admin/news/${p.id}/edit`, publicHref: `/tin-tuc/${p.slug}`, specs: "" },
        }));

  const results = auditAll(inputs);
  const rows: SeoRow[] = inputs.map((i) => {
    const r = results.get(i.id)!;
    return {
      id: i.id,
      kind: i.kind,
      name: i.name,
      metaTitle: i.metaTitle ?? "",
      metaDescription: i.metaDescription ?? "",
      short: i.short ?? "",
      contentText: stripHtml(i.content).slice(0, 1800),
      category: i.categoryName,
      score: r.score,
      googleTitle: r.googleTitle,
      googleDesc: r.googleDesc,
      issues: r.issues,
      editHref: i.extra.editHref!,
      publicHref: i.extra.publicHref!,
      specs: i.extra.specs ?? "",
    };
  });

  const tab = (key: "product" | "post", label: string, n: number) => (
    <Link
      href={`/admin/seo${key === "post" ? "?kind=post" : ""}`}
      className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
        kind === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      <span className={`rounded-full px-2 text-xs ${kind === key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{n}</span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Kiểm tra SEO</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chấm điểm tiêu đề, mô tả, nội dung, ảnh của mọi trang đang hiển thị — đúng như Google nhìn thấy. Bấm vào từng dòng để sửa nhanh.
        </p>
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {tab("product", "Sản phẩm", productCount)}
        {tab("post", "Bài viết", postCount)}
      </div>
      <SeoBoard key={kind} rows={rows} kind={kind} initialIssue={issue} />
    </div>
  );
}
