import ContentRenderer from '@/components/news/ContentRenderer';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { findRedirect } from '@/lib/slug-redirect';
import { decode } from 'he';
import { ImageOff } from 'lucide-react';
import { abs } from '@/lib/site';
import { brandTitle, metaDescription, absImage, breadcrumbJsonLd, ldJson } from '@/lib/seo';

export const revalidate = 60;

type Params = { slug?: string };

/* ================= UTIL ================= */

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(d);
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, '');
  return Math.max(1, Math.ceil(text.length / 1000));
}

function decodeHtml(str: string) {
  return decode(str);
}

function extractHeadings(html: string) {
  const matches = [...html.matchAll(/<h2.*?>(.*?)<\/h2>/gi)];

  return matches.map((m, i) => ({
    id: `h-${i}`,
    text: decodeHtml(m[1].replace(/<[^>]+>/g, '')),
  }));
}

function normalizeContent(html: string) {
  return html
    .replace(/<h1(\s|>)/gi, '<h2$1')
    .replace(/<\/h1>/gi, '</h2>')
    .replace(/<h4(\s|>)/gi, '<h3$1')
    .replace(/<\/h4>/gi, '</h3>');
}

function injectHeadingIds(html: string) {
  let i = 0;
  return html.replace(/<h2(.*?)>/gi, () => {
    return `<h2 id="h-${i++}">`;
  });
}

// 🔥 tối ưu ảnh qua Cloudinary (banner hero: cho phép crop vì là ảnh nền trang trí)
function cldBanner(url?: string | null, w = 1600, h = 500) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com') && u.pathname.includes('/upload/')) {
      return url.replace(
        '/upload/',
        `/upload/c_fill,g_auto,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`
      );
    }
  } catch {}
  return url;
}

// 🔥 srcSet responsive cho ảnh hero: mobile tải bản nhỏ, desktop tải bản lớn
function cldBannerSet(url?: string | null) {
  if (!url) return undefined;
  const variants = [
    { w: 480, h: 240 },
    { w: 768, h: 380 },
    { w: 1200, h: 420 },
    { w: 1600, h: 500 },
  ];
  return variants
    .map((v) => `${cldBanner(url, v.w, v.h)} ${v.w}w`)
    .join(', ');
}

// 🔥 ảnh bài liên quan: không crop, hiện trọn ảnh
function cldPost(url?: string | null, w = 500, h = 320) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com') && u.pathname.includes('/upload/')) {
      return url.replace(
        '/upload/',
        `/upload/c_fit,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`
      );
    }
  } catch {}
  return url;
}

/* ================= DATA ================= */

async function getPost(slug?: string) {
  if (!slug) return null;

  return prisma.post.findUnique({
    where: { slug },
    include: { category: true },
  });
}

async function getRelated(postId: number, categoryId?: number | null) {
  return prisma.post.findMany({
    where: {
      published: true,
      ...(categoryId && { categoryId }),
      id: { not: postId },
    },
    take: 6,
  });
}

/* ================= SEO ================= */

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return {};

  const title = post.metaTitle || post.title;
  const description = metaDescription(post.metaDescription || post.excerpt || post.content) || '';
  const url = post.canonicalUrl || abs(`/tin-tuc/${post.slug}`);
  const image = absImage(post.ogImage || post.coverImage);

  return {
    title: brandTitle(title),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url,
      images: [{ url: image }],
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [image],
    },
    robots: {
      index: !post.noindex,
      follow: !post.nofollow,
    },
  };
}

/* ================= PAGE ================= */

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const post = await getPost(slug);
  if (!post) {
    // Slug cũ (đã đổi tên) → chuyển 308 sang slug mới; không có → 404
    const to = slug ? await findRedirect('post', slug) : null;
    if (to) permanentRedirect(`/tin-tuc/${to}`);
    notFound();
  }
  if (!post.published) notFound();

  let content = post.content || '';

  // 🔥 FIX QUAN TRỌNG
  content = decode(content); // fix encode
  content = normalizeContent(content);

  const headings = extractHeadings(content);
  content = injectHeadingIds(content);

  const related = await getRelated(post.id, post.categoryId);

  // 🔥 JSON-LD Article schema cho SEO
  const postUrl = post.canonicalUrl || abs(`/tin-tuc/${post.slug}`);
  const postImage = absImage(post.ogImage || post.coverImage);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: [postImage],
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'MCBROTHER JSC',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MCBROTHER JSC',
      logo: {
        '@type': 'ImageObject',
        url: abs('/images/logo.png'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return (
    <div className="bg-[var(--color-bg)] text-[var(--color-ink)]">

      {/* 🔥 JSON-LD SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbJsonLd([
              { name: 'Trang chủ', path: '/' },
              { name: 'Tin tức', path: '/tin-tuc' },
              { name: post.title, path: `/tin-tuc/${post.slug}` },
            ])
          ),
        }}
      />

      {/* ================= TIÊU ĐỀ BÀI VIẾT ================= */}
      <header className="mx-auto max-w-[1320px] px-4 pt-10 md:px-8 md:pt-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[14px] text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-ink)]">Trang chủ</Link>
          <span className="px-1">/</span>
          <Link href="/tin-tuc" className="hover:text-[var(--color-ink)]">Kiến thức</Link>
          {post.category?.name && (
            <>
              <span className="px-1">/</span>
              <span className="max-w-[200px] truncate sm:max-w-none">{post.category.name}</span>
            </>
          )}
        </nav>

        <h1 className="display-lg mt-6 max-w-[1000px] text-[clamp(32px,4.8vw,68px)]">{post.title}</h1>

        <div className="mt-5 text-[15px] text-[var(--color-muted)]">
          {fmtDate(post.createdAt)} · {readingTime(content)} phút đọc
        </div>

        {post.coverImage && (
          <div className="mt-10 overflow-hidden rounded-[32px] bg-[var(--color-sand)]">
            <img
              src={cldBanner(post.coverImage) ?? undefined}
              srcSet={cldBannerSet(post.coverImage)}
              sizes="(min-width: 1320px) 1256px, 100vw"
              alt={post.title}
              className="max-h-[560px] w-full object-cover"
            />
          </div>
        )}
      </header>

      {/* ================= BODY ================= */}
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[1fr_320px] lg:gap-16">

        {/* MAIN */}
        <div className="min-w-0">

          {/* MOBILE TOC (chỉ hiện dưới lg) */}
          {headings.length > 0 && (
            <details className="lg:hidden mb-6 border rounded-xl bg-white shadow-sm group">
              <summary className="cursor-pointer select-none list-none px-4 py-3 font-semibold flex items-center justify-between">
                <span>📑 Mục lục</span>
                <span className="text-gray-400 transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>

              <ul className="space-y-2 px-4 pb-4 text-sm">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="text-gray-600 hover:text-[var(--color-primary)] transition"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* SUMMARY */}
          {post.excerpt && (
            <div className="mb-8 rounded-[20px] bg-white p-5 text-[16px] leading-relaxed sm:p-6">
              <strong>Tóm tắt nhanh:</strong> {post.excerpt}
            </div>
          )}

          {/* CONTENT */}
          <div className="max-w-full min-w-0 overflow-x-hidden break-words">
            <ContentRenderer html={content} />
          </div>

          {/* CTA */}
          <div className="mt-14 flex flex-col justify-between gap-6 rounded-[28px] bg-[var(--color-ink)] p-8 text-[var(--color-bg)] sm:flex-row sm:items-center sm:p-10">
            <h3 className="font-display text-[clamp(24px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em]">
              Cần tư vấn giải pháp phù hợp?
            </h3>
            <Link href="/lien-he" className="btn-pill-primary shrink-0">
              Liên hệ ngay
            </Link>
          </div>

          {/* RELATED */}
          {related.length > 0 && (
            <div className="mt-14 sm:mt-20">
              <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6">
                Bài viết liên quan
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                {related.map((r) => {
                  const relImg = cldPost(r.coverImage);

                  return (
                    <Link key={r.id} href={`/tin-tuc/${r.slug}`}>
                      <div className="group border rounded-2xl overflow-hidden hover:shadow-lg transition bg-white h-full flex flex-col">

                        <div className="overflow-hidden bg-white [aspect-ratio:16/10]">
                          {relImg ? (
                            <img
                              src={relImg}
                              alt={r.title}
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
                              <ImageOff className="w-8 h-8" />
                              <span className="text-xs">Không có ảnh</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                          <div className="text-xs text-gray-400 mb-2">
                            {fmtDate(r.createdAt)}
                          </div>

                          <div className="font-semibold line-clamp-2 group-hover:text-[var(--color-primary)]">
                            {r.title}
                          </div>
                        </div>

                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR (chỉ hiện từ lg trở lên) */}
        {headings.length > 0 && (
          <div className="hidden lg:block">
            <div className="sticky top-20">

              <div className="border rounded-2xl p-5 bg-white shadow-sm">
                <div className="font-semibold mb-4">
                  📑 Mục lục
                </div>

                <ul className="space-y-3 text-sm">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-gray-600 hover:text-[var(--color-primary)] transition"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}