"use client";

import { useState } from "react";
import Link from "next/link";
import FbMessengerChat from "@/components/FbMessengerChat";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
        f.reset();
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

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-10">

        {/* HEADER */}
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-800">
            Liên hệ
          </h1>
          <p className="text-gray-600">
            Gửi yêu cầu báo giá hoặc câu hỏi — chúng tôi phản hồi sớm nhất.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* INFO */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 p-5 bg-white">
              <h2 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">
                Thông tin
              </h2>

              <ul className="space-y-2 text-gray-700">
                <li>
                  Điện thoại/Zalo:{" "}
                  <Link
                    href="https://zalo.me/0834551888"
                    target="_blank"
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    0834 551 888
                  </Link>
                </li>

                <li>
                  Email:{" "}
                  <a
                    href="mailto:mcbrother2013@gmail.com"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    mcbrother2013@gmail.com
                  </a>
                </li>

                <li>
                  Địa chỉ: 33 đường số 5, KDC Vĩnh Lộc, P. Bình Hưng Hòa B, Q. Bình Tân, TP.HCM
                </li>
              </ul>
            </div>

            {/* MAP */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  title="Google Map"
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d221.65847940509272!2d106.59103609453759!3d10.807521690744872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752b9b242e47c1%3A0x5e480b67c566bbf9!2zQ8O0bmcgdHkgY-G7lSBwaOG6p24gdGhp4bq_dCBi4buLIE1DQlJPVEhFUg!5e1!3m2!1svi!2s!4v1759564926729!5m2!1svi!2s"
                />
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="rounded-2xl border border-gray-200 p-5 bg-white">
            <h2 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">
              Gửi yêu cầu
            </h2>

            <form onSubmit={onSubmit} className="space-y-3">

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Họ tên *</label>
                  <input
                    name="name"
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="VD: 0834 551 888"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--color-primary)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Tiêu đề</label>
                  <input
                    name="subject"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <p className="-mt-1 text-xs text-gray-500">
                * Chỉ cần số điện thoại <strong>hoặc</strong> email để chúng tôi liên hệ lại.
              </p>

              <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <label className="block text-sm text-gray-700">Nội dung *</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--color-primary)] outline-none"
                />
              </div>

              {/* CTA */}
              <div className="pt-1 flex items-center gap-3">

                <button
                  disabled={loading}
                  className="rounded-lg bg-[var(--color-primary)] text-white px-5 py-2 hover:bg-[var(--color-primary-dark)] transition disabled:opacity-60"
                >
                  {loading ? "Đang gửi..." : "Gửi liên hệ"}
                </button>

                <a
                  href="https://zalo.me/0834551888"
                  target="_blank"
                  className="rounded-lg border border-gray-200 px-5 py-2 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
                >
                  Chat Zalo
                </a>

              </div>

              {ok === true && (
                <p className="text-[var(--color-primary)]">
                  Đã gửi! Chúng tôi sẽ phản hồi sớm.
                </p>
              )}

              {ok === false && (
                <p className="text-red-600">{err}</p>
              )}
            </form>
          </div>
        </div>
      </div>

      <FbMessengerChat />
    </>
  );
}