// app/tim-kiem/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

// Trang kết quả tìm kiếm: không cho Google index (tránh hàng nghìn URL rác ?q=…)
export const metadata: Metadata = {
  title: "Tìm kiếm",
  robots: { index: false, follow: true },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = { q?: string; type?: string; page?: string };

const PER_PAGE = 16;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildHref(
  base: string,
  params: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

function fmtVND(n?: number | null) {
  if (typeof n !== "number") return "Liên hệ";
  try {
    return new Intl.NumberFormat("vi-VN").format(n) + "₫";
  } catch {
    return "Liên hệ";
  }
}

/* ------------------------ QUERIES ------------------------ */
async function searchProducts(q: string, page: number, take: number) {
  const qSlug = q ? slugify(q) : "";
  const where: any = { published: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { short: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      ...(qSlug ? [{ slug: { contains: qSlug, mode: "insensitive" } }] : []),
    ];
  }
  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        short: true,
        coverImage: true,
        price: true,
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
  ]);
  return { count, items };
}

async function searchPosts(q: string, page: number, take: number) {
  const qSlug = q ? slugify(q) : "";
  const where: any = { published: true }; // theo schema bạn có field published:Boolean
  if (q) {
    where.OR = [
      { title:   { contains: q, mode: "insensitive" } },      // không phân biệt hoa/thường
      { excerpt: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
      ...(qSlug ? [{ slug: { contains: qSlug, mode: "insensitive" } }] : []),
    ];
  }

  const [count, items] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        createdAt: true, // ✅ dùng createdAt thay publishedAt
      },
      orderBy: [{ createdAt: "desc" }],   // ✅ sắp xếp theo createdAt
      skip: (page - 1) * take,
      take,
    }),
  ]);

  return { count, items };
}

/* ------------------------ UI HELPERS ------------------------ */
const Tabs = ({
  q,
  type,
}: {
  q: string;
  type: "all" | "product" | "post";
}) => {
  const item = (t: "all" | "product" | "post", label: string) => {
    const active = type === t;
    return (
      <Link
        href={buildHref("/tim-kiem", { q, type: t })}
        className={`px-3 py-1.5 rounded-full text-sm border ${
          active
            ? "bg-[#F5ED42] text-gray-900 border-[#F5ED42]"
            : "text-gray-700 bg-white border-gray-200 hover:bg-gray-50"
        }`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex items-center gap-2 my-3">
      {item("all", "Tất cả")}
      {item("product", "Sản phẩm")}
      {item("post", "Tin tức")}
    </div>
  );
};

/* ------------------------ PAGE ------------------------ */
export default async function GlobalSearch({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParamsPromise;
  const q = (sp.q || "").trim();
  let type: "all" | "product" | "post" = "all";
  if (["product", "sp"].includes((sp.type || "").toLowerCase())) type = "product";
  else if (["post", "tt", "blog", "news"].includes((sp.type || "").toLowerCase()))
    type = "post";

  const page = Math.max(1, Number(sp.page) || 1);

  let prod, posts;
  if (type === "all") {
    [prod, posts] = await Promise.all([
      searchProducts(q, 1, 8),
      searchPosts(q, 1, 6),
    ]);
  } else if (type === "product") {
    prod = await searchProducts(q, page, PER_PAGE);
  } else {
    posts = await searchPosts(q, page, PER_PAGE);
  }

  const totalPages =
    type === "product"
      ? Math.max(1, Math.ceil((prod?.count || 0) / PER_PAGE))
      : type === "post"
      ? Math.max(1, Math.ceil((posts?.count || 0) / PER_PAGE))
      : 1;

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold">Tìm kiếm</h1>

      <form
        action="/tim-kiem"
        className="mt-4 rounded-xl border border-gray-200 bg-white p-2 md:p-3 shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-10">
            <input
              name="q"
              defaultValue={q}
              placeholder="Nhập từ khóa… (tên sản phẩm / bài viết)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              className="w-full rounded-lg bg-[#2653ed] text-white font-medium py-2.5 hover:brightness-110"
              type="submit"
            >
              Tìm
            </button>
          </div>
        </div>
        <input type="hidden" name="type" value={type} />
      </form>

      <Tabs q={q} type={type} />

      {!q ? (
        <p className="text-gray-500 mt-2">Nhập từ khóa để bắt đầu tìm kiếm.</p>
      ) : type === "all" ? (
        <>
          {/* Sản phẩm (preview) */}
          <section className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                Sản phẩm <span className="text-gray-500">({prod?.count || 0})</span>
              </h2>
              {prod && prod.items.length > 0 && (
                <Link
                  href={buildHref("/tim-kiem", { q, type: "product" })}
                  className="text-sm text-[#2653ed] hover:underline"
                >
                  Xem tất cả →
                </Link>
              )}
            </div>
            {prod && prod.items.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {prod.items.map((p) => (
                  <Link
                    href={`/san-pham/${p.slug}`}
                    key={p.id}
                    className="group block rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                      {p.coverImage ? (
                        <img
                          src={p.coverImage}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 md:p-3 space-y-1">
                      <div className="text-[15px] font-bold text-gray-900">
                        {fmtVND(p.price)}
                      </div>
                      <div className="text-sm md:text-[15px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-sky-700 transition">
                        {p.name}
                      </div>
                      {p.short && (
                        <p className="text-xs text-gray-500 line-clamp-2">{p.short}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Không có sản phẩm phù hợp.</p>
            )}
          </section>

          {/* Bài viết (preview) */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                Tin tức / Blog{" "}
                <span className="text-gray-500">({posts?.count || 0})</span>
              </h2>
              {posts && posts.items.length > 0 && (
                <Link
                  href={buildHref("/tim-kiem", { q, type: "post" })}
                  className="text-sm text-[#2653ed] hover:underline"
                >
                  Xem tất cả →
                </Link>
              )}
            </div>

            {posts && posts.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.items.map((a) => (
                  <Link
                    key={a.id}
                    href={`/tin-tuc/${a.slug}`}
                    className="group rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="aspect-[16/9] bg-gray-50 overflow-hidden">
                      {a.coverImage ? (
                        <img
                          src={a.coverImage}
                          alt={a.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold leading-snug group-hover:text-sky-700 line-clamp-2">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {a.excerpt}
                        </p>
                      )}
                      {a.createdAt && ( // ✅ hiển thị createdAt
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Không có bài viết phù hợp.</p>
            )}
          </section>
        </>
      ) : type === "product" ? (
        <>
          <h2 className="sr-only">Sản phẩm</h2>
          {prod && prod.items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
              {prod.items.map((p) => (
                <Link
                  href={`/san-pham/${p.slug}`}
                  key={p.id}
                  className="group block rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition"
                >
                  <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                    {p.coverImage ? (
                      <img
                        src={p.coverImage}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 md:p-3 space-y-1">
                    <div className="text-[15px] font-bold text-gray-900">
                      {fmtVND(p.price)}
                    </div>
                    <div className="text-sm md:text-[15px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-sky-700 transition">
                      {p.name}
                    </div>
                    {p.short && (
                      <p className="text-xs text-gray-500 line-clamp-2">{p.short}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mt-2">Không có sản phẩm phù hợp.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link
                href={buildHref("/tim-kiem", { q, type, page: Math.max(1, page - 1) })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page === 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
                }`}
              >
                Trước
              </Link>
              <span className="text-sm text-gray-600">
                Trang {page}/{totalPages}
              </span>
              <Link
                href={buildHref("/tim-kiem", {
                  q,
                  type,
                  page: Math.min(totalPages, page + 1),
                })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page === totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-gray-50"
                }`}
              >
                Sau
              </Link>
            </div>
          )}
        </>
      ) : (
        /* type === "post" */
        <>
          <h2 className="sr-only">Tin tức / Blog</h2>
          {posts && posts.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {posts.items.map((a) => (
                <Link
                  key={a.id}
                  href={`/tin-tuc/${a.slug}`}
                  className="group rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md transition"
                >
                  <div className="aspect-[16/9] bg-gray-50 overflow-hidden">
                    {a.coverImage ? (
                      <img
                        src={a.coverImage}
                        alt={a.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold leading-snug group-hover:text-sky-700 line-clamp-2">
                      {a.title}
                    </h3>
                    {a.excerpt && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {a.excerpt}
                      </p>
                    )}
                    {a.createdAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mt-2">Không có bài viết phù hợp.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link
                href={buildHref("/tim-kiem", { q, type, page: Math.max(1, page - 1) })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page === 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"
                }`}
              >
                Trước
              </Link>
              <span className="text-sm text-gray-600">
                Trang {page}/{totalPages}
              </span>
              <Link
                href={buildHref("/tim-kiem", {
                  q,
                  type,
                  page: Math.min(totalPages, page + 1),
                })}
                className={`px-3 py-2 rounded-md border text-sm ${
                  page === totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-gray-50"
                }`}
              >
                Sau
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}