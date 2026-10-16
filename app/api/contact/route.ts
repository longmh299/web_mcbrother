// app/api/contact/route.ts
// Nhận form liên hệ: LƯU DATABASE TRƯỚC (không bao giờ mất liên hệ), rồi mới gửi email thông báo.
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/* ---------- Giới hạn ---------- */
const MAX = { name: 100, email: 200, phone: 30, subject: 200, message: 5000, page: 300 };
const RATE_LIMIT = 5; // tối đa 5 lần gửi
const RATE_WINDOW = 10 * 60 * 1000; // mỗi 10 phút / IP

/** Escape ký tự HTML để nội dung người dùng không thể chèn thẻ/link vào email. */
function esc(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Bỏ xuống dòng: tránh chèn header vào tiêu đề email. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function renderHtml(o: {
  name: string; email?: string; phone?: string; subject?: string; message: string;
  page?: string; ip?: string | null; ua?: string | null; adminUrl?: string;
}) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
    <h2>Liên hệ mới từ website</h2>
    <p><b>Họ tên:</b> ${esc(o.name)}</p>
    ${o.phone ? `<p><b>Điện thoại:</b> ${esc(o.phone)}</p>` : ""}
    ${o.email ? `<p><b>Email:</b> ${esc(o.email)}</p>` : ""}
    ${o.subject ? `<p><b>Tiêu đề:</b> ${esc(o.subject)}</p>` : ""}
    ${o.page ? `<p><b>Gửi từ trang:</b> ${esc(o.page)}</p>` : ""}
    <p><b>Nội dung:</b></p>
    <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px">${esc(o.message)}</pre>
    ${o.adminUrl ? `<p><a href="${esc(o.adminUrl)}">Mở trang quản lý liên hệ</a></p>` : ""}
    <hr/>
    <p style="color:#64748b"><small>IP: ${esc(o.ip ?? "-")} | UA: ${esc(o.ua ?? "-")}</small></p>
  </div>`;
}

/** Gửi email thông báo. Lỗi ở đây KHÔNG làm hỏng yêu cầu của khách (liên hệ đã lưu DB). */
async function notifyByEmail(o: Parameters<typeof renderHtml>[0]) {
  const apiKey = process.env.RESEND_API_KEY;
  const toList = (process.env.CONTACT_TO_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey || !toList.length) {
    console.error("CONTACT_EMAIL_SKIPPED: thiếu RESEND_API_KEY hoặc CONTACT_TO_EMAIL");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.MAIL_FROM || "MCBROTHER <onboarding@resend.dev>",
      to: toList,
      ...(o.email ? { replyTo: o.email } : {}),
      subject: `📩 Liên hệ mới: ${o.subject || o.name}${o.phone ? ` – ${o.phone}` : ""}`,
      html: renderHtml(o),
    });
    if (error) console.error("RESEND_ERROR", error);
  } catch (e) {
    console.error("RESEND_EXCEPTION", e);
  }
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers);
    const ua = req.headers.get("user-agent")?.slice(0, 300) || null;

    if (!rateLimit(`contact:${ip}`, RATE_LIMIT, RATE_WINDOW)) {
      return NextResponse.json(
        { ok: false, error: "Bạn gửi quá nhiều lần, vui lòng thử lại sau ít phút." },
        { status: 429 }
      );
    }

    const j = await req.json().catch(() => ({} as any));

    // Honeypot chống bot: trả ok giả để bot không biết bị chặn
    if (j.website) return NextResponse.json({ ok: true });

    const name = oneLine(str(j.name, MAX.name));
    const email = str(j.email, MAX.email) || undefined;
    const phone = oneLine(str(j.phone, MAX.phone)) || undefined;
    const subject = oneLine(str(j.subject, MAX.subject)) || undefined;
    const message = str(j.message, MAX.message);
    const page =
      oneLine(str(j.page, MAX.page)) ||
      oneLine(str(req.headers.get("referer"), MAX.page)) ||
      undefined;

    if (!name || !message) {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập họ tên và nội dung." }, { status: 400 });
    }
    // Chỉ cần SĐT HOẶC email (khách B2B thường chỉ để lại SĐT)
    if (!phone && !email) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng nhập số điện thoại hoặc email để chúng tôi liên hệ lại." },
        { status: 400 }
      );
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
    }
    if (phone && !/^[0-9+\-.\s()]{8,30}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "Số điện thoại không hợp lệ" }, { status: 400 });
    }

    // 1) LƯU DATABASE — bước bắt buộc. Lỗi ở đây mới báo lỗi cho khách.
    const saved = await prisma.contactMessage.create({
      data: { name, email, phone, subject, message, page, ip, useragent: ua },
      select: { id: true },
    });

    // 2) GỬI EMAIL THÔNG BÁO — lỗi thì chỉ ghi log, liên hệ vẫn nằm trong admin.
    const site = (process.env.SITE_URL || "").replace(/\/$/, "");
    await notifyByEmail({
      name, email, phone, subject, message, page, ip, ua,
      adminUrl: site ? `${site}/admin/lien-he` : undefined,
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (e) {
    console.error("CONTACT_API_ERROR", e);
    return NextResponse.json(
      { ok: false, error: "Hệ thống đang bận, vui lòng gọi hotline 0834 551 888." },
      { status: 500 }
    );
  }
}