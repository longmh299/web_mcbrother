"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Newspaper,
  Tags,
  Inbox,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";

const NAV = [
  { href: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục SP", icon: FolderTree },
  { href: "/admin/news", label: "Tin tức", icon: Newspaper },
  { href: "/admin/news-categories", label: "Chuyên mục tin tức", icon: Tags },
  { href: "/admin/lien-he", label: "Liên hệ khách hàng", icon: Inbox, badgeKey: "contacts" as const },
];

function isActive(pathname: string | null, href: string, exact?: boolean) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ onNavigate, newContacts = 0 }: { onNavigate?: () => void; newContacts?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon size={18} className={active ? "text-blue-600" : "text-slate-400"} />
            <span className="flex-1">{item.label}</span>
            {"badgeKey" in item && newContacts > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {newContacts > 99 ? "99+" : newContacts}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-slate-100 p-3 space-y-1">
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        <ExternalLink size={18} className="text-slate-400" />
        Xem trang web
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </form>
    </div>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100 shrink-0">
      <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        MC
      </div>
      <div className="leading-tight min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800 truncate">MCBROTHER</div>
        <div className="text-[11px] text-slate-400 truncate">Quản trị nội dung</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export default function AdminSidebar({ newContacts = 0 }: { newContacts?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ===== DESKTOP: sidebar cố định bên trái ===== */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-slate-200 bg-white sticky top-0 h-dvh">
        <Brand />
        <NavLinks newContacts={newContacts} />
        <SidebarFooter />
      </aside>

      {/* ===== MOBILE: topbar + drawer ===== */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            MC
          </div>
          <span className="text-sm font-semibold text-slate-800">MCBROTHER Admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Mở menu"
        >
          <span className="relative inline-flex">
            <Menu size={20} />
            {newContacts > 0 && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
          </span>
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white flex flex-col shadow-xl">
            <Brand onClose={() => setOpen(false)} />
            <NavLinks onNavigate={() => setOpen(false)} newContacts={newContacts} />
            <SidebarFooter />
          </div>
        </div>
      )}
    </>
  );
}