// app/admin/lien-he/page.tsx
// Danh sách liên hệ khách gửi từ website (form /lien-he).
import Link from "next/link";
import { Inbox, Mail, Phone, Search, CheckCircle2, RotateCcw, Globe } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ConfirmDelete from "@/components/ConfirmDelete";
import { deleteContact, saveContactNote, setContactStatus } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SP = { status?: string; q?: string; page?: string };

function fmtTime(d: Date) {
  // Server Vercel chạy giờ UTC → ép hiển thị theo giờ Việt Nam
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function href(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && !(k === "page" && Number(v) === 1)) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/admin/lien-he?${qs}` : "/admin/lien-he";
}

export default async function ContactsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const status = sp.status === "done" || sp.status === "all" ? sp.status : "new";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: any = {};
  if (status !== "all") where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total, countNew, countDone] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdat: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: "new" } }),
    prisma.contactMessage.count({ where: { status: "done" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const tabs = [
    { key: "new", label: "Mới", count: countNew },
    { key: "done", label: "Đã xử lý", count: countDone },
    { key: "all", label: "Tất cả", count: countNew + countDone },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Inbox className="text-blue-600" /> Liên hệ từ khách hàng
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Khách gửi qua form trên website. Liên hệ được lưu ở đây kể cả khi email thông báo bị lỗi.
        </p>
      </div>

      {/* TABS + SEARCH */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={href({ status: t.key, q })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                status === t.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
              }`}
            >
              {t.label}
              <span
                className={`ml-2 inline-block min-w-[1.5rem] rounded-full px-1.5 text-xs ${
                  status === t.key ? "bg-white/20" : t.key === "new" && t.count > 0 ? "bg-red-500 text-white" : "bg-slate-100"
                }`}
              >
                {t.count}
              </span>
            </Link>
          ))}
        </div>

        <form action="/admin/lien-he" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm tên, SĐT, email, nội dung…"
              className="w-72 max-w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-900">
            Tìm
          </button>
        </form>
      </div>

      {/* LIST */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">
          {q ? "Không có liên hệ phù hợp." : status === "new" ? "Không có liên hệ mới 🎉" : "Chưa có liên hệ."}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                c.status === "new" ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                {/* Người gửi */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    {c.status === "new" ? (
                      <span className="rounded-full bg-blue-50 text-blue-700 text-xs px-2 py-0.5">Mới</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5">
                        Đã xử lý
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{fmtTime(c.createdat)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium">
                        <Phone size={14} /> {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline">
                        <Mail size={14} /> {c.email}
                      </a>
                    )}
                    {c.page && (
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Globe size={14} /> {c.page}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thao tác */}
                <div className="flex items-center gap-2 shrink-0">
                  <form action={setContactStatus}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value={c.status === "new" ? "done" : "new"} />
                    {c.status === "new" ? (
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700">
                        <CheckCircle2 size={16} /> Đã xử lý
                      </button>
                    ) : (
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                        <RotateCcw size={16} /> Đánh dấu mới
                      </button>
                    )}
                  </form>
                  <ConfirmDelete
                    action={deleteContact}
                    hidden={{ id: c.id }}
                    label="Xoá"
                    confirmText={`Xoá liên hệ của "${c.name}"?`}
                    className="rounded-lg border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
                  />
                </div>
              </div>

              {/* Nội dung */}
              {c.subject && <div className="mt-3 text-sm font-medium text-slate-800">{c.subject}</div>}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                {c.message}
              </p>

              {/* Ghi chú nội bộ */}
              <form action={saveContactNote} className="mt-3 flex flex-col sm:flex-row gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="note"
                  defaultValue={c.note ?? ""}
                  placeholder="Ghi chú nội bộ (VD: đã gọi lại 15/10, gửi báo giá máy hút chân không…)"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                  Lưu ghi chú
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Link
            href={href({ status, q, page: page - 1 })}
            className={`px-3 py-2 rounded-lg border bg-white ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            ← Trước
          </Link>
          <span className="text-slate-600">
            Trang {page}/{totalPages}
          </span>
          <Link
            href={href({ status, q, page: page + 1 })}
            className={`px-3 py-2 rounded-lg border bg-white ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}
          >
            Sau →
          </Link>
        </div>
      )}
    </div>
  );
}