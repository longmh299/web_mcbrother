// app/admin/layout.tsx
import "@/app/globals.css";
import AdminSidebar from "@/components/AdminSidebar";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import type { Metadata } from "next";

// Trang quản trị: không cho Google index
export const metadata: Metadata = {
  title: { default: "Quản trị", template: "%s – Quản trị MCBROTHER" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isAdmin();

  // Chưa đăng nhập (trang /admin/login): không hiện menu quản trị
  if (!loggedIn) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
        <div className="w-full">{children}</div>
      </div>
    );
  }

  // Số liên hệ chưa xử lý → hiện badge đỏ trên menu
  const newContacts = await prisma.contactMessage.count({ where: { status: "new" } }).catch(() => 0);

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-slate-50 text-slate-900">
      <AdminSidebar newContacts={newContacts} />

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
