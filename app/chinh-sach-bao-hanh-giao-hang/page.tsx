// app/chinh-sach-bao-hanh-giao-hang/page.tsx
import type { Metadata } from "next";
import {
  ShieldCheck,
  Wrench,
  Clock,
  PhoneCall,
  Truck,
  PackageCheck,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Chính sách bảo hành & giao hàng | ${SITE.name}`,
  description:
    "Chính sách bảo hành 6-12 tháng theo từng loại sản phẩm và chính sách giao hàng, lắp đặt của MCBROTHER JSC.",
};

const WARRANTY = [
  {
    icon: ShieldCheck,
    title: "Thời gian bảo hành",
    desc: "Từ 6–12 tháng kể từ ngày bàn giao, tùy theo từng loại sản phẩm, áp dụng cho lỗi do nhà sản xuất.",
  },
  {
    icon: Wrench,
    title: "Phạm vi bảo hành",
    desc: "Miễn phí kiểm tra, sửa chữa hoặc thay thế linh kiện lỗi kỹ thuật từ nhà sản xuất. Không áp dụng với hư hỏng do vận hành sai kỹ thuật, tự ý tháo lắp, hoặc thiên tai.",
  },
  {
    icon: AlertTriangle,
    title: "Không bao gồm vật tư hao mòn",
    desc: "Các vật tư hao mòn theo quá trình sử dụng (dao cắt, dây curoa, gioăng cao su, bóng đèn, cầu chì...) không thuộc phạm vi bảo hành.",
  },
  {
    icon: Clock,
    title: "Thời gian xử lý",
    desc: "Tiếp nhận và phản hồi trong 24–48h. Với lỗi tại chỗ, đội kỹ thuật hỗ trợ trực tiếp tận nơi trong khu vực TP.HCM và các tỉnh lân cận.",
  },
];

const SHIPPING = [
  {
    icon: MapPin,
    title: "Phạm vi giao hàng",
    desc: "Giao hàng toàn quốc. Khu vực TP.HCM và các tỉnh lân cận được ưu tiên hỗ trợ lắp đặt trực tiếp tận nơi.",
  },
  {
    icon: Truck,
    title: "Thời gian giao hàng",
    desc: "2–5 ngày làm việc với thiết bị có sẵn tại kho. Với đơn hàng đặt riêng theo yêu cầu, thời gian cụ thể được tư vấn ngay khi báo giá.",
  },
  {
    icon: PackageCheck,
    title: "Lắp đặt & hướng dẫn vận hành",
    desc: "Đội kỹ thuật MCBROTHER hỗ trợ lắp đặt, chạy thử và hướng dẫn vận hành tận nơi, đảm bảo bàn giao đúng thông số kỹ thuật.",
  },
];

function PolicyGrid({ items }: { items: typeof WARRANTY }) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {items.map((it) => (
        <div
          key={it.title}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <it.icon className="w-6 h-6 text-[var(--color-primary)] mb-3" />
          <h3 className="font-semibold text-slate-800 mb-1">{it.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function WarrantyShippingPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
          Chính sách bảo hành & giao hàng
        </h1>
        <p className="text-gray-600">
          {SITE.name} cam kết đồng hành cùng khách hàng từ khâu giao hàng, lắp
          đặt đến bảo hành trong suốt quá trình sử dụng thiết bị.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Bảo hành
        </h2>
        <PolicyGrid items={WARRANTY} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Giao hàng & lắp đặt
        </h2>
        <PolicyGrid items={SHIPPING} />
      </section>

      <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 flex items-start gap-2">
        <PhoneCall className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" />
        <p>
          Thời gian bảo hành cụ thể theo từng sản phẩm được ghi rõ trong báo
          giá / hợp đồng. Mọi thắc mắc vui lòng liên hệ hotline{" "}
          <a
            href={`tel:${SITE.phone}`}
            className="font-semibold text-[var(--color-primary)]"
          >
            {SITE.phoneDisplay}
          </a>{" "}
          hoặc email{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="font-semibold text-[var(--color-primary)]"
          >
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </main>
  );
}