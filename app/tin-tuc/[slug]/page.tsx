import ContentRenderer from '@/components/news/ContentRenderer';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { findRedirect } from '@/lib/slug-redirect';
import { decode } from 'he';
import { ImageOff } from 'lucide-react';
import { abs } from '@/lib/site';

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
  const description = post.metaDescription || post.excerpt || '';
  const url = post.canonicalUrl || abs(`/tin-tuc/${post.slug}`);
  const image = post.ogImage || post.coverImage || abs('/images/placeholder.jpg');

  return {
    title,
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
  const postImage = post.ogImage || post.coverImage || abs('/images/placeholder.jpg');

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
    <div className="bg-[var(--color-bg)] text-slate-800">

      {/* 🔥 JSON-LD SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ================= HERO ================= */}
      <div className="relative w-full h-[200px] sm:h-[320px] md:h-[420px] overflow-hidden">
        {post.coverImage && (
          <img
            src={cldBanner(post.coverImage) ?? undefined}
            srcSet={cldBannerSet(post.coverImage)}
            sizes="100vw"
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-black/60" />

        <div className="relative max-w-6xl mx-auto px-4 h-full flex flex-col justify-center text-white">
          <div className="text-xs sm:text-sm mb-2 sm:mb-3 opacity-80 flex flex-wrap items-center gap-1">
            <Link href="/" className="hover:underline">Trang chủ</Link>
            <span>/</span>
            <Link href="/tin-tuc" className="hover:underline">Tin tức</Link>
            {post.category?.name && (
              <>
                <span>/</span>
                <span className="truncate max-w-[160px] sm:max-w-none">
                  {post.category.name}
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight mb-3 sm:mb-4 line-clamp-3">
            {post.title}
          </h1>

          <div className="text-xs sm:text-sm opacity-80">
            {fmtDate(post.createdAt)} • {readingTime(content)} phút đọc
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10 md:py-12 grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">

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
                      className="text-gray-600 hover:text-[var(--color-accent)] transition"
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
            <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-blue-50 border rounded-xl text-sm">
              <strong>Tóm tắt nhanh:</strong> {post.excerpt}
            </div>
          )}

          {/* CONTENT */}
          <div className="max-w-full min-w-0 overflow-x-hidden break-words">
            <ContentRenderer html={content} />
          </div>

          {/* CTA */}
          <div className="mt-12 sm:mt-16 bg-[var(--color-accent)] text-white rounded-2xl p-6 sm:p-8 text-center">
            <h3 className="text-lg sm:text-xl font-semibold mb-3">
              Cần tư vấn giải pháp phù hợp?
            </h3>

            <Link
              href="/lien-he"
              className="bg-white text-black px-6 py-3 rounded-lg block sm:inline-block w-full sm:w-auto text-center font-medium"
            >
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

                        <div className="overflow-hidden bg-white aspect-[16/10]">
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

                          <div className="font-semibold line-clamp-2 group-hover:text-[var(--color-accent)]">
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
                        className="text-gray-600 hover:text-[var(--color-accent)] transition"
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