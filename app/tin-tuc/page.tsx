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

  // Bài nổi bật: bài mới nhất ở trang 1, khi không lọc/tìm kiếm
  const showFeatured = page === 1 && !q && !categoryId && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const rest = showFeatured ? items.slice(1) : items;

  const pill = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[14px] transition ${
      active
        ? "border-[var(--color-ink)] bg-[var(--color-ink)] font-semibold text-white"
        : "border-[var(--color-line)] font-medium hover:border-[var(--color-ink)]"
    }`;

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* ===== TIÊU ĐỀ ===== */}
      <section className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-4 pb-10 pt-14 md:px-8 md:pt-20">
        <div className="space-y-5">
          <span className="eyebrow">Kiến thức</span>
          <h1 className="display-xl text-[clamp(40px,6vw,84px)]">Tin tức & kiến thức</h1>
          <p className="max-w-[560px] text-[16px] leading-relaxed text-[var(--color-muted)]">
            Kiến thức vận hành, tư vấn thiết bị và xu hướng công nghệ trong ngành chế biến — đóng gói thực phẩm.
          </p>
        </div>

        {/* Tìm kiếm */}
        <form action="/tin-tuc" className="flex w-full max-w-[380px] items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1.5 pl-5">
          {categoryId ? <input type="hidden" name="categoryId" value={categoryId} /> : null}
          <label htmlFor="news-q" className="sr-only">Tìm bài viết</label>
          <input
            id="news-q"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Tìm bài viết..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button type="submit" className="btn-pill-dark min-h-[40px] px-5 text-[14px] font-medium">
            Tìm
          </button>
        </form>
      </section>

      {/* ===== CHUYÊN MỤC ===== */}
      {categories.length > 0 && (
        <div className="sticky top-20 z-30 border-y border-[var(--color-line)] bg-[rgba(246,244,239,0.95)] backdrop-blur-md">
          <nav aria-label="Chuyên mục" className="mx-auto flex max-w-[1320px] gap-2 overflow-x-auto px-4 py-3 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={buildHref("/tin-tuc", { q })} className={pill(!categoryId)}>
              Tất cả
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={buildHref("/tin-tuc", { q, categoryId: c.id })} className={pill(categoryId === c.id)}>
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <section className="mx-auto max-w-[1320px] space-y-16 px-4 py-14 md:px-8 md:py-20">
        {q && (
          <p className="text-[15px] text-[var(--color-muted)]">
            Kết quả cho “<strong className="text-[var(--color-ink)]">{q}</strong>” ·{" "}
            <Link href={buildHref("/tin-tuc", { categoryId })} className="underline">Xoá tìm kiếm</Link>
          </p>
        )}

        {items.length === 0 ? (
          <div className="rounded-[24px] bg-[var(--color-sand)] px-6 py-16 text-center text-[var(--color-muted)]">
            Không có bài viết phù hợp.
          </div>
        ) : (
          <>
            {/* BÀI NỔI BẬT */}
            {featured && (
              <Link href={`/tin-tuc/${featured.slug}`} className="group grid items-center gap-8 md:grid-cols-[1.3fr_1fr] md:gap-12">
                <div className="[aspect-ratio:16/10] overflow-hidden rounded-[32px] bg-[var(--color-sand)]">
                  {featured.coverImage ? (
                    <img
                      src={cldPost(featured.coverImage, 1100, 690) ?? undefined}
                      alt={featured.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="space-y-4">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                    Mới nhất{featured.category?.name ? ` · ${featured.category.name}` : ""}
                  </div>
                  <h2 className="display-lg text-[clamp(28px,3.2vw,44px)] group-hover:text-[var(--color-primary)]">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="line-clamp-3 text-[17px] leading-relaxed text-[var(--color-muted)]">{featured.excerpt}</p>
                  )}
                  <time className="block text-[14px] text-[var(--color-muted)]">{fmtDate(featured.createdAt)}</time>
                </div>
              </Link>
            )}

            {/* LƯỚI BÀI VIẾT */}
            {rest.length > 0 && (
              <div className="grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((n) => (
                  <Link key={n.id} href={`/tin-tuc/${n.slug}`} className="group flex flex-col gap-4">
                    <div className="[aspect-ratio:4/3] overflow-hidden rounded-[24px] bg-[var(--color-sand)]">
                      {n.coverImage ? (
                        <img
                          src={cldPost(n.coverImage, 720, 540) ?? undefined}
                          alt={n.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                      {n.category?.name || "Tin tức"}
                    </div>
                    <h3 className="line-clamp-2 font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.025em] group-hover:text-[var(--color-primary)]">
                      {n.title}
                    </h3>
                    {n.excerpt && (
                      <p className="line-clamp-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{n.excerpt}</p>
                    )}
                    <time className="text-[14px] text-[var(--color-muted)]">{fmtDate(n.createdAt)}</time>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== PHÂN TRANG ===== */}
        {totalPages > 1 && (
          <nav aria-label="Phân trang" className="flex items-center justify-center gap-2 pt-4">
            <Link
              href={buildHref("/tin-tuc", { q, categoryId, page: Math.max(1, page - 1) })}
              className={`btn-pill border border-[var(--color-line)] px-5 font-medium ${page === 1 ? "pointer-events-none opacity-40" : "hover:border-[var(--color-ink)]"}`}
            >
              Trước
            </Link>
            <div className="hidden gap-2 sm:flex">
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                const active = n === page;
                return (
                  <Link
                    key={n}
                    href={buildHref("/tin-tuc", { q, categoryId, page: n })}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-[15px] transition ${
                      active ? "bg-[var(--color-ink)] font-semibold text-white" : "border border-[var(--color-line)] hover:border-[var(--color-ink)]"
                    }`}
                  >
                    {n}
                  </Link>
                );
              })}
            </div>
            <Link
              href={buildHref("/tin-tuc", { q, categoryId, page: Math.min(totalPages, page + 1) })}
              className={`btn-pill border border-[var(--color-line)] px-5 font-medium ${page === totalPages ? "pointer-events-none opacity-40" : "hover:border-[var(--color-ink)]"}`}
            >
              Sau
            </Link>
          </nav>
        )}
      </section>
    </main>
  );
}