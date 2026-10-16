// components/PublicOnly.tsx
"use client";
// Ẩn phần giao diện của website (header, footer, nút gọi, Zalo, Google Analytics)
// khi đang ở trang quản trị /admin.
import { usePathname } from "next/navigation";

export default function PublicOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
