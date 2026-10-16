// app/lien-he/layout.tsx
// page.tsx của /lien-he là client component ("use client") nên không khai báo metadata được
// → đặt metadata ở layout này.
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Liên hệ – Báo giá máy chế biến & đóng gói",
  description: `Liên hệ ${SITE.name}: hotline ${SITE.phoneDisplay}, email ${SITE.email}. Địa chỉ: ${SITE.address}. Tư vấn & báo giá nhanh trong ngày.`,
  alternates: { canonical: "/lien-he" },
  openGraph: { title: "Liên hệ | MCBROTHER", url: "/lien-he" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}