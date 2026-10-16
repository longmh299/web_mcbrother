// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import Footer from "@/components/Footer";
import CTA from "@/components/CTA";
import HeaderShell from "@/components/HeaderShell";
import CallCTA from "@/components/CallCTA";
import GoogleAnalytics from "@/components/Googleanalytics";
import { SITE_URL, SITE } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import PublicOnly from "@/components/PublicOnly";
import ClickTracker from "@/components/ClickTracker";

export const metadata: Metadata = {
  // Gốc để Next tự đổi đường dẫn tương đối (ảnh OG, canonical) thành URL đầy đủ
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Máy chế biến & đóng gói thực phẩm công nghiệp | MCBROTHER",
    // Trang con chỉ cần đặt title ngắn, ví dụ "Sản phẩm" → "Sản phẩm | MCBROTHER"
    template: "%s | MCBROTHER",
  },
  description:
    "MCBROTHER JSC – Giải pháp máy chế biến & đóng gói thực phẩm cho doanh nghiệp: lắp đặt tận nơi, bảo hành chính hãng, hỗ trợ kỹ thuật trọn đời.",
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE.name,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE],
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-surface text-gray-900 antialiased selection:bg-primary/10 selection:text-primary"
      >
        {/* Trang /admin: ẩn header, footer, nút gọi, Zalo, GA của website */}
        <PublicOnly>
          <GoogleAnalytics />
          <ClickTracker />
          <HeaderShell />
        </PublicOnly>

        {children}

        <PublicOnly>
          <Footer />
          <CallCTA />
          <CTA side="right" zalo="0834551888" defaultOpen />
        </PublicOnly>
        {/* <MessengerBtn /> */}
      </body>
    </html>
  );
}