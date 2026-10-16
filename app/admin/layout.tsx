// app/admin/layout.tsx
import "@/app/globals.css";
import AdminSidebar from "@/components/AdminSidebar";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Số liên hệ chưa xử lý → hiện badge đỏ trên menu (chỉ đếm khi đã đăng nhập)
  const newContacts = (await isAdmin())
    ? await prisma.contactMessage.count({ where: { status: "new" } }).catch(() => 0)
    : 0;

  return (
    <div className="min-h-dvh flex bg-slate-50 text-slate-900">
      <AdminSidebar newContacts={newContacts} />

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}