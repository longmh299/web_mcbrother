// app/gioi-thieu/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Clock,
  FlaskConical,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
  Wrench,
} from "lucide-react";
import { SITE, abs } from "@/lib/site";
import { ldJson } from "@/lib/seo";

/* ================= DATA ================= */
// Năm thành lập dùng để tự tính "số năm kinh nghiệm" (không phải sửa tay mỗi năm)
const FOUNDED_YEAR = 2013;
const YEARS = new Date().getFullYear() - FOUNDED_YEAR;

const COMPANY = {
  name: "Công ty Cổ phần Thiết bị MCBROTHER",
  slogan:
    "Đồng hành số hoá sản xuất thực phẩm — tối ưu vận hành, nâng tầm chuẩn chất lượng.",
  summary:
    "MCBROTHER JSC là doanh nghiệp tư vấn giải pháp và cung cấp thiết bị cho chuỗi chế biến — đóng gói thực phẩm. Chúng tôi tập trung vào hiệu quả vận hành, an toàn và tính bền vững.",
};

// ⚠️ Kiểm tra lại các con số này cho đúng thực tế trước khi đăng
const STATS = [
  { value: `${YEARS}+`, label: "năm kinh nghiệm" },
  { value: "1.200+", label: "khách hàng & đối tác" },
  { value: "250+", label: "dự án triển khai" },
  { value: "24–48h", label: "phản hồi kỹ thuật" },
];

const FIELDS = [
  {
    icon: Utensils,
    title: "Thực phẩm",
    desc: "Máy và dây chuyền chế biến, đóng gói thực phẩm cho xưởng, nhà máy và bếp công nghiệp.",
  },
  {
    icon: FlaskConical,
    title: "Dược phẩm",
    desc: "Thiết bị chế biến, chiết rót và đóng gói cho cơ sở sản xuất dược phẩm.",
  },
  {
    icon: Sparkles,
    title: "Hoá mỹ phẩm",
    desc: "Máy chiết rót, dán nhãn, co màng, in date cho ngành hoá mỹ phẩm.",
  },
  {
    icon: Package,
    title: "Các ngành khác",
    desc: "Giải pháp đóng gói, hoàn thiện sản phẩm theo yêu cầu riêng của từng doanh nghiệp.",
  },
];

const METHODS = [
  { step: "01", title: "Khảo sát", desc: "Tìm hiểu sản phẩm, sản lượng và mặt bằng thực tế." },
  { step: "02", title: "Tư vấn & báo giá", desc: "Đề xuất thiết bị đúng công suất, không dư thừa." },
  { step: "03", title: "Lắp đặt & chạy thử", desc: "Lắp đặt tận nơi, chạy thử và hướng dẫn vận hành." },
  { step: "04", title: "Bảo hành & bảo trì", desc: "Hỗ trợ kỹ thuật, linh kiện thay thế trong suốt quá trình sử dụng." },
];

// Lấy từ chính sách bảo hành & giao hàng (/chinh-sach-bao-hanh-giao-hang)
const COMMITMENTS = [
  { icon: ShieldCheck, title: "Bảo hành 6–12 tháng", desc: "Tuỳ từng loại thiết bị, ghi rõ trong báo giá / hợp đồng." },
  { icon: Clock, title: "Phản hồi trong 24–48h", desc: "Tiếp nhận và xử lý yêu cầu kỹ thuật nhanh chóng." },
  { icon: Truck, title: "Giao hàng toàn quốc", desc: "Ưu tiên lắp đặt trực tiếp tại TP.HCM và các tỉnh lân cận." },
  { icon: Wrench, title: "Hướng dẫn vận hành tận nơi", desc: "Bàn giao đúng thông số, nhân viên vận hành được ngay." },
];

/* ================= SEO ================= */
export const metadata: Metadata = {
  title: "Giới thiệu",
  description: `${SITE.legalName} (thành lập ${FOUNDED_YEAR}) chuyên cung cấp máy chế biến & đóng gói cho ngành thực phẩm, dược phẩm, hoá mỹ phẩm: tư vấn giải pháp, lắp đặt tận nơi, bảo hành và hỗ trợ kỹ thuật.`,
  alternates: { canonical: "/gioi-thieu" },
  openGraph: { title: "Giới thiệu | MCBROTHER", url: "/gioi-thieu" },
};

/* ================= PAGE ================= */
export default function AboutPage() {
  // JSON-LD: giúp Google hiểu thông tin doanh nghiệp (tên pháp lý, MST, địa chỉ, liên hệ)
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: abs("/gioi-thieu"),
    name: `Giới thiệu ${SITE.name}`,
    mainEntity: {
      "@type": "Organization",
      name: SITE.name,
      legalName: SITE.legalName,
      url: abs("/"),
      logo: abs("/images/logo.png"),
      foundingDate: "2013-04-10",
      taxID: SITE.taxCode,
      email: SITE.email,
      telephone: "+84-834-551-888",
      address: {
        "@type": "PostalAddress",
        streetAddress: "33 đường số 5, KDC Vĩnh Lộc, Bình Hưng Hòa B",
        addressLocality: "Bình Tân",
        addressRegion: "TP. Hồ Chí Minh",
        addressCountry: "VN",
      },
      sameAs: [SITE.facebookUrl, SITE.youtubeUrl, SITE.tiktokUrl, SITE.zaloUrl],
    },
  };

  return (
    <main className="bg-[var(--color-bg)] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(orgLd) }}
      />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-[#dff6f7]">
        <img
          src="https://res.cloudinary.com/ds55hfvx4/image/upload/v1774489339/hero_banner_u2ziwq.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent" />

        <div className="relative max-w-7xl xl:max-w-[1280px] mx-auto px-4 min-h-[460px] md:min-h-[540px] flex items-center">
          <div className="w-full lg:w-3/5 z-10 py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Về MCBROTHER
            </p>

            <h1 className="mt-3 text-[36px] md:text-[52px] leading-tight font-bold text-slate-800">
              {COMPANY.name}
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed">
              {COMPANY.slogan}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                Thành lập 10/04/2013
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-[var(--color-primary)]" />
                MST {SITE.taxCode}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                Bình Tân, TP.HCM
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/san-pham"
                className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dark)] transition"
              >
                Xem sản phẩm
              </Link>
              <Link
                href="/lien-he"
                className="px-6 py-3 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] font-semibold bg-white/70 hover:bg-white transition"
              >
                Liên hệ tư vấn
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-start">
          {/* LEFT */}
          <div>
            <h2 className="text-[24px] font-semibold text-[var(--color-primary)]">
              Về chúng tôi
            </h2>

            <p className="mt-4 text-gray-600 leading-relaxed">{COMPANY.summary}</p>

            <div className="mt-4 text-gray-600 leading-relaxed space-y-3 text-[15px]">
              <p>
                Công ty cổ phần thiết bị MCBROTHER được thành lập ngày 10 tháng 4 năm 2013
                với ngành nghề kinh doanh chính là:
              </p>

              <ul className="list-disc pl-5 space-y-1">
                <li>Máy, dây chuyền chế biến, đóng gói thực phẩm;</li>
                <li>Máy chế biến, đóng gói dược phẩm;</li>
                <li>Máy chế biến, đóng gói hóa mỹ phẩm;</li>
                <li>Máy chế biến, đóng gói cho các ngành khác.</li>
              </ul>

              <p>
                Với phương châm{" "}
                <strong>&quot;Chất lượng - Chuẩn giá cả - Chuẩn dịch vụ&quot;</strong>, chúng
                tôi luôn cố gắng hết mình để đem đến sự hài lòng cho Quý khách hàng và đã được
                sự ủng hộ tin tưởng trong thời gian qua.
              </p>

              <p>
                Với tinh thần cầu thị và học hỏi, đội ngũ chúng tôi luôn không ngừng hoàn thiện
                và nâng cao trình độ chuyên môn để đáp ứng nhu cầu phục vụ khách hàng tốt nhất.
              </p>

              <p>
                Chúng tôi xin chân thành cảm ơn các khách hàng đã và đang tin cậy hợp tác cùng
                chúng tôi, và luôn chào đón mở rộng hợp tác cùng Quý khách.
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-xl bg-white">
              <img
                src="https://res.cloudinary.com/ds55hfvx4/image/upload/v1778229923/ChatGPT_Image_15_45_05_8_thg_5_2026_gvhmuh.png"
                alt="MCBROTHER JSC – máy chế biến và đóng gói thực phẩm"
                className="w-full h-auto object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4 mt-14 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-[28px] font-semibold text-[var(--color-primary)]">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== LĨNH VỰC ===== */}
      <section className="py-20 bg-[var(--color-bg)]">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-semibold text-[var(--color-primary)]">
              Lĩnh vực chúng tôi phục vụ
            </h2>
            <p className="mt-3 text-gray-600">
              Thiết bị và giải pháp cho nhiều ngành sản xuất, từ xưởng nhỏ đến nhà máy.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FIELDS.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 transition hover:shadow-xl hover:border-[var(--color-primary)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-800">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== QUY TRÌNH ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">
          <h2 className="text-[24px] font-semibold text-[var(--color-primary)] mb-10">
            Quy trình làm việc
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {METHODS.map((m) => (
              <div
                key={m.step}
                className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-xl transition hover:border-[var(--color-primary)]"
              >
                <div className="text-[22px] font-bold text-[var(--color-primary)]">{m.step}</div>
                <h3 className="mt-2 font-semibold">{m.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CAM KẾT DỊCH VỤ ===== */}
      <section className="py-20 bg-[var(--color-bg)]">
        <div className="max-w-7xl xl:max-w-[1280px] mx-auto px-4">
          <h2 className="text-[24px] font-semibold text-[var(--color-primary)]">
            Cam kết dịch vụ
          </h2>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5">
                <c.icon className="w-6 h-6 shrink-0 text-[var(--color-primary)]" />
                <div>
                  <h3 className="font-semibold text-slate-800">{c.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/chinh-sach-bao-hanh-giao-hang"
            className="mt-6 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Xem chi tiết chính sách bảo hành & giao hàng →
          </Link>
        </div>
      </section>

      {/* ===== THÔNG TIN DOANH NGHIỆP ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-[24px] font-semibold text-[var(--color-primary)] text-center">
            Thông tin doanh nghiệp
          </h2>

          <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm divide-y">
            {[
              { icon: Building2, label: "Tên công ty", value: SITE.legalName },
              { icon: BadgeCheck, label: "Mã số thuế", value: `${SITE.taxCode} (cấp ngày ${SITE.taxCodeIssuedAt})` },
              { icon: MapPin, label: "Địa chỉ", value: SITE.address },
              { icon: Phone, label: "Hotline", value: SITE.phoneDisplay, href: `tel:${SITE.phone}` },
              { icon: Mail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
            ].map((row) => (
              <div key={row.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-6 py-4">
                <div className="flex items-center gap-2 sm:w-44 shrink-0 text-sm text-gray-500">
                  <row.icon className="w-4 h-4 text-[var(--color-primary)]" />
                  {row.label}
                </div>
                {row.href ? (
                  <a href={row.href} className="font-medium text-slate-800 hover:text-[var(--color-primary)]">
                    {row.value}
                  </a>
                ) : (
                  <div className="font-medium text-slate-800">{row.value}</div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Bạn cần tư vấn thiết bị phù hợp cho dây chuyền sản xuất?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={SITE.zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] transition"
              >
                Chat Zalo tư vấn
              </a>
              <Link
                href="/lien-he"
                className="inline-block border border-[var(--color-primary)] text-[var(--color-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary)]/5 transition"
              >
                Gửi yêu cầu báo giá
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}