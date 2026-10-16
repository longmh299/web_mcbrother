// components/news/ShareButtons.tsx
// Nút chia sẻ bài viết: Facebook và sao chép link (dán vào Zalo/Messenger).
"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);

  const btn =
    "inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-dark)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-slate-500">Chia sẻ:</span>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer" className={btn}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.7c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z" />
        </svg>
        Facebook
      </a>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            prompt("Sao chép link:", url);
          }
        }}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Đã sao chép" : "Sao chép link"}
      </button>
    </div>
  );
}
