// app/gioi-thieu/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  FlaskConical,
  Package,
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
      "@type": "LocalBusiness",
      "@id": abs("/#organization"),
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
    <main className="bg-[var(--color-bg)] text-[var(--color-ink)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(orgLd) }} />

      {/* ===== TIÊU ĐỀ ===== */}
      <section className="mx-auto max-w-[1320px] space-y-7 px-4 pt-14 md:px-8 md:pt-20">
        <span className="eyebrow">Về MCBROTHER · Từ {FOUNDED_YEAR}</span>
        <h1 className="display-xl max-w-[1100px] text-[clamp(40px,6.4vw,92px)]">
          {COMPANY.name}
        </h1>
        <p className="max-w-[680px] text-[18px] leading-relaxed text-[var(--color-muted)] md:text-[20px]">
          {COMPANY.slogan}
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-[var(--color-muted)]">
          <span>Thành lập {SITE.taxCodeIssuedAt}</span>
          <span>MST {SITE.taxCode}</span>
          <span>Bình Tân, TP.HCM</span>
        </div>
      </section>

      {/* ===== ẢNH LỚN ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pt-12 md:px-8">
        <div className="overflow-hidden rounded-[32px] bg-[var(--color-sand)]">
          <img
            src="https://res.cloudinary.com/ds55hfvx4/image/upload/f_auto,q_auto,c_limit,w_1600/v1778229923/ChatGPT_Image_15_45_05_8_thg_5_2026_gvhmuh.png"
            alt="MCBROTHER JSC – máy chế biến và đóng gói thực phẩm"
            className="max-h-[620px] w-full object-cover"
          />
        </div>
      </section>

      {/* ===== SỐ LIỆU ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pt-10 md:px-8">
        <div className="grid grid-cols-2 border-t border-[var(--color-line)] md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="py-7">
              <div className="font-display text-[clamp(32px,3.6vw,48px)] font-semibold tracking-[-0.04em]">{s.value}</div>
              <div className="mt-1 text-[15px] text-[var(--color-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CÂU CHUYỆN ===== */}
      <section className="mx-auto grid max-w-[1320px] gap-10 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="display-lg text-[clamp(32px,3.8vw,54px)]">Về chúng tôi</h2>
        <div className="space-y-5 text-[18px] leading-[1.75] text-[#3A3833]">
          <p className="text-[20px] text-[var(--color-ink)]">{COMPANY.summary}</p>
          <p>
            Công ty cổ phần thiết bị MCBROTHER được thành lập ngày 10 tháng 4 năm 2013 với ngành nghề kinh
            doanh chính là:
          </p>
          <ul className="space-y-1.5 pl-5 [list-style:disc]">
            <li>Máy, dây chuyền chế biến, đóng gói thực phẩm;</li>
            <li>Máy chế biến, đóng gói dược phẩm;</li>
            <li>Máy chế biến, đóng gói hóa mỹ phẩm;</li>
            <li>Máy chế biến, đóng gói cho các ngành khác.</li>
          </ul>
          <p>
            Với phương châm <strong>&quot;Chất lượng - Chuẩn giá cả - Chuẩn dịch vụ&quot;</strong>, chúng tôi
            luôn cố gắng hết mình để đem đến sự hài lòng cho Quý khách hàng và đã được sự ủng hộ tin tưởng
            trong thời gian qua.
          </p>
          <p>
            Với tinh thần cầu thị và học hỏi, đội ngũ chúng tôi luôn không ngừng hoàn thiện và nâng cao trình
            độ chuyên môn để đáp ứng nhu cầu phục vụ khách hàng tốt nhất.
          </p>
          <p>
            Chúng tôi xin chân thành cảm ơn các khách hàng đã và đang tin cậy hợp tác cùng chúng tôi, và luôn
            chào đón mở rộng hợp tác cùng Quý khách.
          </p>
        </div>
      </section>

      {/* ===== LĨNH VỰC ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pb-24 md:px-8 md:pb-32">
        <div className="mb-10 space-y-4">
          <span className="eyebrow">Lĩnh vực</span>
          <h2 className="display-lg text-[clamp(32px,3.8vw,54px)]">Lĩnh vực chúng tôi phục vụ</h2>
        </div>
        <div className="grid border-t border-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map((f) => (
            <div key={f.title} className="space-y-3 py-8 pr-8">
              <f.icon className="h-6 w-6 text-[var(--color-primary)]" />
              <h3 className="font-display text-[24px] font-semibold tracking-[-0.02em]">{f.title}</h3>
              <p className="text-[15px] leading-relaxed text-[var(--color-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== QUY TRÌNH (khối đen) ===== */}
      <section className="bg-[var(--color-ink)] text-[var(--color-bg)]">
        <div className="mx-auto max-w-[1320px] px-4 py-24 md:px-8 md:py-32">
          <h2 className="display-lg max-w-[760px] text-[clamp(32px,4.4vw,60px)]">
            Quy trình làm việc
            <br />
            <span className="text-[#8F8A80]">từ khảo sát đến bảo trì.</span>
          </h2>
          <ol className="mt-14 grid border-t border-[#3A3833] sm:grid-cols-2 lg:grid-cols-4">
            {METHODS.map((m) => (
              <li key={m.step} className="space-y-3 py-8 pr-8">
                <span className="font-display text-[15px] text-[#5FC3CF]">{m.step}</span>
                <h3 className="font-display text-[24px] font-semibold tracking-[-0.02em]">{m.title}</h3>
                <p className="text-[15px] leading-relaxed text-[#B5B0A6]">{m.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== CAM KẾT DỊCH VỤ ===== */}
      <section className="mx-auto max-w-[1320px] px-4 py-24 md:px-8 md:py-32">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-4">
            <span className="eyebrow">Cam kết</span>
            <h2 className="display-lg text-[clamp(32px,3.8vw,54px)]">Cam kết dịch vụ</h2>
          </div>
          <Link href="/chinh-sach-bao-hanh-giao-hang" className="link-underline">
            Chính sách bảo hành & giao hàng
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENTS.map((c) => (
            <div key={c.title} className="space-y-3 rounded-[24px] bg-white p-7">
              <c.icon className="h-6 w-6 text-[var(--color-primary)]" />
              <h3 className="font-display text-[20px] font-semibold tracking-[-0.015em]">{c.title}</h3>
              <p className="text-[15px] leading-relaxed text-[var(--color-muted)]">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== THÔNG TIN DOANH NGHIỆP ===== */}
      <section className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-24 md:px-8 md:pb-32 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="display-lg text-[clamp(32px,3.8vw,54px)]">Thông tin doanh nghiệp</h2>
        <dl className="border-t border-[var(--color-line)] text-[16px]">
          {[
            { label: "Tên công ty", value: SITE.legalName },
            { label: "Mã số thuế", value: `${SITE.taxCode} (cấp ngày ${SITE.taxCodeIssuedAt})` },
            { label: "Địa chỉ", value: SITE.address },
            { label: "Hotline", value: SITE.phoneDisplay, href: `tel:${SITE.phone}` },
            { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[38%_1fr] gap-4 border-b border-[var(--color-line)] py-4">
              <dt className="text-[var(--color-muted)]">{row.label}</dt>
              {row.href ? (
                <dd><a href={row.href} className="font-semibold hover:text-[var(--color-primary)]">{row.value}</a></dd>
              ) : (
                <dd className="font-semibold">{row.value}</dd>
              )}
            </div>
          ))}
        </dl>
      </section>

      {/* ===== KÊU GỌI ===== */}
      <section className="mx-auto max-w-[1320px] px-4 pb-24 md:px-8 md:pb-32">
        <div className="flex flex-col justify-between gap-8 rounded-[32px] bg-[var(--color-primary)] p-[clamp(32px,6vw,80px)] text-white md:flex-row md:items-end">
          <h2 className="display-lg max-w-[640px] text-[clamp(30px,4vw,56px)]">
            Cần tư vấn thiết bị cho dây chuyền sản xuất?
          </h2>
          <div className="flex flex-wrap gap-3">
            <a href={SITE.zaloUrl} target="_blank" rel="noopener noreferrer" className="btn-pill bg-white text-[var(--color-ink)] hover:bg-[var(--color-bg)]">
              Chat Zalo tư vấn
            </a>
            <Link href="/lien-he" className="btn-pill border border-white font-medium text-white hover:bg-white/10">
              Gửi yêu cầu báo giá
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
