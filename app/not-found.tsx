import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false, follow: true },
};

/** Trang 404 tiếng Việt: giữ khách ở lại bằng ô tìm kiếm + lối đi tiếp. */
export default function NotFound() {
  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="mx-auto flex max-w-[760px] flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
        <span className="eyebrow">Lỗi 404</span>
        <h1 className="display-lg text-[clamp(32px,4.6vw,56px)] [text-wrap:balance]">
          Không tìm thấy trang bạn cần
        </h1>
        <p className="max-w-[560px] text-[17px] leading-relaxed text-[var(--color-muted)]">
          Trang có thể đã đổi đường dẫn hoặc sản phẩm đã ngừng hiển thị. Bạn thử tìm theo tên hoặc mã máy:
        </p>

        <form
          action="/tim-kiem"
          method="get"
          role="search"
          className="flex w-full max-w-[560px] items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1.5 pl-5 focus-within:border-[var(--color-ink)]"
        >
          <input
            type="search"
            name="q"
            required
            placeholder="VD: máy dán nhãn, DZ-400…"
            aria-label="Từ khoá tìm kiếm"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-[var(--color-muted)]"
          />
          <button type="submit" className="btn-pill-dark min-h-[44px] shrink-0 px-5 font-medium">
            Tìm
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/san-pham" className="btn-pill-primary min-h-[50px] px-7">
            Xem tất cả sản phẩm
          </Link>
          <Link href="/" className="btn-pill-outline min-h-[50px] px-7">
            Về trang chủ
          </Link>
        </div>

        <p className="pt-4 text-[15px] text-[var(--color-muted)]">
          Cần tìm máy nhanh? Gọi{" "}
          <a href={`tel:${SITE.phone}`} className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
            {SITE.phoneDisplay}
          </a>{" "}
          hoặc{" "}
          <Link href="/lien-he" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
            gửi yêu cầu báo giá
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
