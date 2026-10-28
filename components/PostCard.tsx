// components/PostCard.tsx
import Link from 'next/link';
import { ImageOff } from 'lucide-react';

export type PostCardData = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: Date;
  category?: { id: number; name: string } | null;
};

function cldCover(url: string | null, w = 600, h = 340) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (
      u.hostname.includes('res.cloudinary.com') &&
      u.pathname.includes('/upload/')
    ) {
      return url.replace(
        '/upload/',
        `/upload/c_fit,f_auto,q_auto,dpr_auto,w_${w},h_${h}/`
      );
    }
  } catch {}
  return url;
}

export default function PostCard({ p }: { p: PostCardData }) {
  const imgUrl = cldCover(p.coverImage, 600, 340);

  return (
    <article className="group overflow-hidden rounded-xl border bg-white hover:shadow-md transition">
      <Link href={`/tin-tuc/${p.slug}`} className="block">
        <div className="relative h-44 w-full bg-gray-50 overflow-hidden">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={p.title}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-300">
              <ImageOff className="w-8 h-8" />
              <span className="text-xs">Không có ảnh</span>
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {p.category ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5">{p.category.name}</span>
            ) : null}
            <time dateTime={new Date(p.createdAt).toISOString()}>
              {new Date(p.createdAt).toLocaleDateString('vi-VN')}
            </time>
          </div>

          <h2 className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-[var(--color-primary)]">
            {p.title}
          </h2>

          {p.excerpt ? (
            <p className="line-clamp-3 text-sm text-gray-600">{p.excerpt}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}