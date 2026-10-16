// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

function renderHtml(o: {
  name: string; email: string; phone?: string; subject?: string; message: string;
  page?: string; ip?: string | null; ua?: string | null;
}) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
    <h2>New contact from website</h2>
    <p><b>Name:</b> ${esc(o.name)}</p>
    <p><b>Email:</b> ${esc(o.email)}</p>
    ${o.phone ? `<p><b>Phone:</b> ${esc(o.phone)}</p>` : ""}
    ${o.subject ? `<p><b>Subject:</b> ${esc(o.subject)}</p>` : ""}
    ${o.page ? `<p><b>Page:</b> ${esc(o.page)}</p>` : ""}
    <p><b>Message:</b></p>
    <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px">${esc(o.message)}</pre>
    <hr/>
    <p style="color:#64748b"><small>IP: ${esc(o.ip ?? "-")} | UA: ${esc(o.ua ?? "-")}</small></p>
  </div>`;
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

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
    const email = str(j.email, MAX.email);
    const message = str(j.message, MAX.message);
    const phone = oneLine(str(j.phone, MAX.phone)) || undefined;
    const subject = oneLine(str(j.subject, MAX.subject)) || undefined;
    const page = oneLine(str(j.page, MAX.page)) || undefined;

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return NextResponse.json({ ok: false, error: "Email không hợp lệ" }, { status: 400 });
    }
    if (phone && !/^[0-9+\-.\s()]{6,30}$/.test(phone)) {
      return NextResponse.json({ ok: false, error: "Số điện thoại không hợp lệ" }, { status: 400 });
    }

    const html = renderHtml({ name, email, phone, subject, message, page, ip, ua });

    // Người nhận: hỗ trợ 1 hoặc nhiều email, phân tách dấu phẩy trong env
    const toList = (process.env.CONTACT_TO_EMAIL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!toList.length) {
      console.error("CONTACT_TO_EMAIL chưa được cấu hình");
      return NextResponse.json({ ok: false, error: "Lỗi máy chủ" }, { status: 500 });
    }

    const from = process.env.MAIL_FROM || "MCBROTHER <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to: toList,
      replyTo: email,
      subject: `📩 Liên hệ mới: ${subject || name}`,
      html,
    });

    if (error) {
      console.error("RESEND_ERROR", error);
      // Không lộ chi tiết lỗi của Resend ra trình duyệt
      return NextResponse.json({ ok: false, error: "Gửi thất bại, vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error("CONTACT_API_ERROR", e);
    return NextResponse.json({ ok: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}