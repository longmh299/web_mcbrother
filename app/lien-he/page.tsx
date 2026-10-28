"use client";

import { useEffect, useState } from "react";
import FbMessengerChat from "@/components/FbMessengerChat";
import { trackLead } from "@/lib/track";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Khách bấm "Nhận báo giá máy này" ở trang sản phẩm → /lien-he?sp=<tên máy>
  // → tự điền sẵn tiêu đề + nội dung để khách chỉ cần nhập tên & số điện thoại.
  const [product, setProduct] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search).get("sp")?.trim().slice(0, 150);
    if (sp) {
      setProduct(sp);
      setSubject(`Báo giá: ${sp}`);
      setMessage(`Tôi cần báo giá máy: ${sp}.\n`);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setOk(null); setErr(null);

    const f = e.currentTarget;
    const data = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;

    // Cần ít nhất SĐT hoặc email để liên hệ lại
    if (!data.phone?.trim() && !data.email?.trim()) {
      setLoading(false);
      setOk(false);
      setErr("Vui lòng nhập số điện thoại hoặc email để chúng tôi liên hệ lại.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, page: "/lien-he" }),
      });

      const json = await res.json().catch(() => ({}));

      if (json?.ok) {
        setOk(true);
        trackLead("form", data.subject || "Form liên hệ");
        f.reset();
        setSubject("");
        setMessage("");
        setProduct(null);
      } else {
        setOk(false);
        setErr(json?.error || "Gửi thất bại. Vui lòng thử lại hoặc gọi 0834 551 888.");
      }
    } catch {
      // Mất mạng / lỗi kết nối → không để nút kẹt ở "Đang gửi..."
      setOk(false);
      setErr("Không gửi được do lỗi kết nối. Vui lòng thử lại hoặc gọi 0834 551 888.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full border-0 border-b-[1.5px] border-[var(--color-line)] bg-transparent px-0 py-3 text-[17px] text-[var(--color-ink)] outline-none transition placeholder:text-[#A8A399] focus:border-[var(--color-primary)]";
  const labelCls = "block text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]";

  return (
    <>
      <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
        <section className="mx-auto grid max-w-[1320px] items-start gap-14 px-4 pb-16 pt-14 md:px-8 md:pt-20 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          {/* ===== TRÁI: TIÊU ĐỀ + THÔNG TIN ===== */}
          <div className="space-y-10">
            <div className="space-y-5">
              <span className="eyebrow">Liên hệ</span>
              <h1 className="display-xl text-[clamp(40px,5.6vw,80px)]">
                Nói cho chúng tôi
                <br />
                <span className="text-[#8C877D]">bạn cần gì.</span>
              </h1>
              <p className="max-w-[440px] text-[17px] leading-relaxed text-[var(--color-muted)]">
                Gửi yêu cầu báo giá hoặc câu hỏi — chúng tôi phản hồi sớm nhất. Tư vấn miễn phí.
              </p>
            </div>

            <div className="border-t border-[var(--color-line)]">
              <a href="tel:0834551888" className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] py-5">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Hotline</span>
                <span className="font-display text-[26px] font-semibold tracking-[-0.02em]">0834 551 888</span>
              </a>
              <a href="https://zalo.me/0834551888" target="_blank" rel="noopener" className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] py-5">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Zalo</span>
                <span className="font-display text-[26px] font-semibold tracking-[-0.02em]">Nhắn ngay →</span>
              </a>
              <a href="mailto:mcbrother2013@gmail.com" className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] py-5">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Email</span>
                <span className="text-[18px] font-medium">mcbrother2013@gmail.com</span>
              </a>
              <div className="flex flex-wrap justify-between gap-4 border-b border-[var(--color-line)] py-5">
                <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Showroom</span>
                <span className="max-w-[300px] text-right text-[16px] leading-relaxed">
                  33 đường số 5, KDC Vĩnh Lộc, P. Bình Hưng Hòa B, Q. Bình Tân, TP.HCM
                </span>
              </div>
            </div>
          </div>

          {/* ===== PHẢI: FORM ===== */}
          <div className="rounded-[32px] bg-white p-[clamp(24px,4vw,48px)]">
            <h2 className="font-display text-[30px] font-semibold tracking-[-0.03em]">Yêu cầu báo giá</h2>
            {product ? (
              <p className="mb-8 mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-[rgba(10,114,130,0.1)] px-4 py-2 text-[14px] text-[var(--color-primary-dark)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                <span className="truncate">Đang hỏi giá: <strong className="font-semibold">{product}</strong></span>
              </p>
            ) : (
              <div className="mb-8" />
            )}

            <form onSubmit={onSubmit} className="space-y-7">
              <div className="grid gap-7 md:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className={labelCls}>Họ tên *</label>
                  <input id="c-name" name="name" required placeholder="Nguyễn Văn A" className={field} />
                </div>
                <div>
                  <label htmlFor="c-phone" className={labelCls}>Số điện thoại *</label>
                  <input
                    id="c-phone"
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="09xx xxx xxx"
                    className={field}
                  />
                </div>
              </div>

              <div className="grid gap-7 md:grid-cols-2">
                <div>
                  <label htmlFor="c-email" className={labelCls}>Email</label>
                  <input id="c-email" type="email" name="email" autoComplete="email" placeholder="info@congty.vn" className={field} />
                </div>
                <div>
                  <label htmlFor="c-subject" className={labelCls}>Bạn quan tâm</label>
                  <select
                    id="c-subject"
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={`${field} cursor-pointer`}
                  >
                    <option value="">Chọn nhu cầu…</option>
                    {product && <option value={`Báo giá: ${product}`}>Báo giá: {product}</option>}
                    <option>Máy chế biến thực phẩm</option>
                    <option>Máy đóng gói, hút chân không</option>
                    <option>Máy chiết rót</option>
                    <option>Máy dán nhãn, co màng, in date</option>
                    <option>Dây chuyền trọn gói</option>
                    <option>Linh kiện vật tư</option>
                    <option>Khác</option>
                  </select>
                </div>
              </div>

              <p className="-mt-3 text-[13px] text-[var(--color-muted)]">
                * Chỉ cần số điện thoại <strong>hoặc</strong> email để chúng tôi liên hệ lại.
              </p>

              {/* chống spam (khách không thấy) */}
              <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <label htmlFor="c-message" className={labelCls}>Nội dung *</label>
                <textarea
                  id="c-message"
                  name="message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Sản phẩm cần chế biến/đóng gói, sản lượng mỗi ngày, mặt bằng…"
                  className={`${field} resize-y`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-pill-primary min-h-[54px] px-8 text-[16px] disabled:opacity-60">
                  {loading ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
                </button>
                <a href="https://zalo.me/0834551888" target="_blank" rel="noopener" className="btn-pill-outline min-h-[54px]">
                  Chat Zalo
                </a>
              </div>

              {ok === true && (
                <p className="rounded-2xl bg-[rgba(10,114,130,0.1)] px-4 py-3 text-[15px] font-medium text-[var(--color-primary-dark)]">
                  Đã gửi! Chúng tôi sẽ phản hồi sớm. Cần gấp, gọi 0834 551 888.
                </p>
              )}
              {ok === false && <p className="rounded-2xl bg-red-50 px-4 py-3 text-[15px] text-red-700">{err}</p>}
            </form>
          </div>
        </section>

        {/* ===== BẢN ĐỒ ===== */}
        <section className="mx-auto max-w-[1320px] px-4 pb-24 md:px-8 md:pb-32">
          <div className="relative min-h-[320px] overflow-hidden rounded-[32px] bg-[var(--color-sand)]" style={{ paddingTop: "40%" }}>
            <iframe
              title="Bản đồ showroom MCBROTHER"
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d221.65847940509272!2d106.59103609453759!3d10.807521690744872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752b9b242e47c1%3A0x5e480b67c566bbf9!2zQ8O0bmcgdHkgY-G7lSBwaOG6p24gdGhp4bq_dCBi4buLIE1DQlJPVEhFUg!5e1!3m2!1svi!2s!4v1759564926729!5m2!1svi!2s"
            />
          </div>
        </section>
      </main>

      <FbMessengerChat />
    </>
  );
}