// app/tin-tuc/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  categoryId?: string;
  page?: string;
};

const PER_PAGE = 12;

function buildHref(
  base: string,
  params: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      sp.set(k, String(v));
    }
  });

  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "";

  const dt = typeof d === "string" ? new Date(d) : d;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

function cldPost(url?: string | null, w = 600, h = 450) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (
      u.hostname.includes("res.cloudinary.com") &&
      u.pathname.includes("/upload/")
    ) {
      return url.replace(
        "/upload/",
        `/upload/c_fit,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`
      );
    }
  } catch {}
  return url;
}

async function getData(params: SearchParams) {
  const q = (params.q ?? "").trim();
  const categoryId = params.categoryId
    ? Number(params.categoryId)
    : undefined;

  const page = Math.max(1, Number(params.page) || 1);

  const where: any = {
    published: true,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const [count, items, categories] = await Promise.all([
    prisma.post.count({ where }),

    prisma.post.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,

      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        createdAt: true,

        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.postCategory.findMany({
      orderBy: [
        { order: "asc" },
        { name: "asc" },
      ],

      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    q,
    categoryId,
    page,
    totalPages: Math.max(1, Math.ceil(count / PER_PAGE)),
    items,
    categories,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const categoryId = sp.categoryId && /^\d+$/.test(sp.categoryId) ? sp.categoryId : undefined;
  const hasQuery = Boolean((sp.q ?? "").trim());

  // Canonical trỏ về đúng trang đang xem (giữ category + page, bỏ tham số rác)
  const qs = new URLSearchParams();
  if (categoryId) qs.set("categoryId", categoryId);
  if (page > 1) qs.set("page", String(page));
  const canonical = `/tin-tuc${qs.toString() ? `?${qs}` : ""}`;

  return {
    title: page > 1 ? `Tin tức – Trang ${page}` : "Tin tức – Kiến thức máy chế biến & đóng gói",
    description:
      "Tin tức, kinh nghiệm chọn máy, hướng dẫn vận hành và bảo trì máy chế biến – đóng gói thực phẩm từ đội ngũ kỹ thuật MCBROTHER.",
    alternates: { canonical },
    openGraph: { title: "Tin tức | MCBROTHER", url: canonical },
    // Trang kết quả tìm kiếm nội bộ: không cho Google index, vẫn cho đi theo link
    robots: hasQuery ? { index: false, follow: true } : undefined,
  };
}

export default async function NewsPage({
  searchParams: spPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await spPromise;

  const {
    q,
    categoryId,
    page,
    totalPages,
    items,
    categories,
  } = await getData(sp);

  return (
    <section className="w-full bg-[var(--color-bg)]">

      <div className="container px-4 lg:px-6 pt-10 pb-8 md:pt-14 md:pb-10">

        {/* ================= HEADER ================= */}
        <div className="mb-8 md:mb-10">

          <p
            className="
              text-sm
              font-medium
              text-[var(--color-primary)]
              uppercase
              tracking-[0.18em]
              mb-3
            "
          >
            Blog & Kiến thức
          </p>

          <h1
            className="
              text-3xl
              md:text-5xl
              font-bold
              tracking-tight
              text-slate-900
            "
          >
            Tin tức
          </h1>

          <p
            className="
              mt-4
              text-slate-600
              max-w-2xl
              leading-relaxed
              text-[15px]
              md:text-base
            "
          >
            Kiến thức vận hành, tư vấn thiết bị và xu hướng công nghệ
            trong ngành chế biến — đóng gói thực phẩm.
          </p>

        </div>

        {/* ================= MOBILE SEARCH ================= */}
        <form
          action="/tin-tuc"
          className="
            sm:hidden
            mb-6
            rounded-xl
            border
            border-gray-200
            bg-white
            p-3
            shadow-sm
          "
        >
          <div className="grid grid-cols-1 gap-2">

            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Tìm bài viết..."
              className="
                w-full
                rounded-lg
                border
                border-gray-200
                px-3
                py-2
                text-sm
                outline-none
                transition
                focus:border-[var(--color-primary)]
              "
            />

            <select
              name="categoryId"
              defaultValue={categoryId ?? ""}
              className="
                w-full
                rounded-lg
                border
                border-gray-200
                px-3
                py-2
                text-sm
                outline-none
                transition
                focus:border-[var(--color-primary)]
              "
            >
              <option value="">Tất cả chuyên mục</option>

              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="
                rounded-lg
                bg-[var(--color-primary)]
                px-3
                py-2
                text-sm
                text-white
                transition
                hover:bg-[var(--color-primary-dark)]
              "
            >
              Tìm kiếm
            </button>

          </div>
        </form>

        {/* ================= GRID ================= */}
        {items.length === 0 ? (

          <div className="text-gray-500">
            Không có bài viết phù hợp.
          </div>

        ) : (

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              md:grid-cols-3
              xl:grid-cols-4
              gap-5
              lg:gap-7
            "
          >

            {items.map((n) => (

              <Link
                key={n.id}
                href={`/tin-tuc/${n.slug}`}
                className="
                  group
                  block
                  overflow-hidden
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-2xl
                  hover:border-cyan-300
                "
              >

                {/* IMAGE */}
                <div className="overflow-hidden bg-white">

                  <div className="aspect-[4/3]">

                    {n.coverImage ? (

                      <img
                        src={cldPost(n.coverImage) ?? undefined}
                        alt={n.title}
                        loading="lazy"
                        className="
                          h-full
                          w-full
                          object-contain
                        "
                      />

                    ) : (

                      <div
                        className="
                          flex
                          h-full
                          w-full
                          items-center
                          justify-center
                          text-sm
                          text-gray-400
                        "
                      >
                        No Image
                      </div>

                    )}

                  </div>

                </div>

                {/* CONTENT */}
                <div className="p-4">

                  {/* META */}
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-x-2
                      gap-y-1
                      text-[12px]
                      text-gray-500
                    "
                  >

                    <time>{fmtDate(n.createdAt)}</time>

                    {n.category?.name && (
                      <>
                        <span className="hidden sm:inline">•</span>

                        <span
                          className="
                            inline-flex
                            items-center
                            rounded-full
                            border
                            border-gray-200
                            bg-white
                            px-2
                            py-0.5
                          "
                        >
                          {n.category.name}
                        </span>
                      </>
                    )}

                  </div>

                  {/* TITLE */}
                  <h3
                    className="
                      mt-2
                      text-[16px]
                      font-semibold
                      leading-snug
                      text-slate-900
                      line-clamp-2
                      transition
                      group-hover:text-[var(--color-primary)]
                    "
                  >
                    {n.title}
                  </h3>

                  {/* EXCERPT */}
                  {n.excerpt && (
                    <p
                      className="
                        mt-2
                        text-[13px]
                        leading-relaxed
                        text-slate-600
                        line-clamp-2
                      "
                    >
                      {n.excerpt}
                    </p>
                  )}

                </div>

              </Link>

            ))}

          </div>

        )}

        {/* ================= PAGINATION ================= */}
        {totalPages > 1 && (

          <nav
            className="
              mt-10
              flex
              items-center
              justify-center
              gap-2
            "
          >

            <Link
              href={buildHref("/tin-tuc", {
                q,
                categoryId,
                page: Math.max(1, page - 1),
              })}
              className={`
                px-4 py-2 rounded-xl border text-sm transition
                ${
                  page === 1
                    ? "opacity-40 pointer-events-none"
                    : "bg-white hover:border-[var(--color-primary)]"
                }
              `}
            >
              Trước
            </Link>

            <div className="hidden sm:flex gap-2">

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const active = p === page;

                return (
                  <Link
                    key={p}
                    href={buildHref("/tin-tuc", {
                      q,
                      categoryId,
                      page: p,
                    })}
                    className={`
                      px-4 py-2 rounded-xl border text-sm transition
                      ${
                        active
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-white hover:border-[var(--color-primary)]"
                      }
                    `}
                  >
                    {p}
                  </Link>
                );
              })}

            </div>

            <Link
              href={buildHref("/tin-tuc", {
                q,
                categoryId,
                page: Math.min(totalPages, page + 1),
              })}
              className={`
                px-4 py-2 rounded-xl border text-sm transition
                ${
                  page === totalPages
                    ? "opacity-40 pointer-events-none"
                    : "bg-white hover:border-[var(--color-primary)]"
                }
              `}
            >
              Sau
            </Link>

          </nav>

        )}

      </div>

    </section>
  );
}