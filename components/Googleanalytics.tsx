"use client";
// Google Analytics 4. Chỉ tải GA khi /api/ga-status cho phép:
// không tải cho admin đang đăng nhập, mạng công ty đã loại trừ, và bot → số liệu GA sạch hơn.

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GA_MEASUREMENT_ID, gaPageview } from "../lib/Gtag";

function GaPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    // Không đếm lượt truy cập khu vực quản trị vào số liệu công khai.
    if (pathname?.startsWith("/admin")) return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname || "/";
    gaPageview(url);
  }, [pathname, searchParams]);

  return null;
}

/** Hỏi server 1 lần mỗi lần tải trang (chuyển trang trong web không hỏi lại) */
function useAllowed() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if ((navigator as any).webdriver) return setOk(false); // trình duyệt tự động (bot, tool test)
    fetch("/api/ga-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOk(j?.track !== false))
      .catch(() => setOk(true)); // lỗi mạng → vẫn đếm như bình thường
  }, []);
  return ok;
}

export default function GoogleAnalytics() {
  const allowed = useAllowed();
  if (!GA_MEASUREMENT_ID || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){ window.dataLayer.push(arguments); }
          window.gtag = gtag;
          gtag('js', new Date());
          // send_page_view: false — vì tracker bên dưới tự bắn page_view
          // theo từng lần chuyển route (App Router là SPA, không reload trang).
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>

      {/* useSearchParams() cần bọc Suspense khi dùng trong layout */}
      <Suspense fallback={null}>
        <GaPageviewTracker />
      </Suspense>
    </>
  );
}
