// components/admin/SeoSuggestButton.tsx
// Nút "✨ Gợi ý" trong form sửa: lấy nội dung đang nhập → gợi ý tiêu đề & mô tả SEO.
"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export type SeoSuggestPayload = {
  kind: "product" | "post";
  name: string;
  category?: string | null;
  short?: string | null;
  content?: string | null;
  specs?: string | null;
};

export default function SeoSuggestButton({
  getPayload,
  onResult,
  onError,
}: {
  getPayload: () => SeoSuggestPayload;
  onResult: (r: { metaTitle: string; metaDescription: string; source: "ai" | "rule" }) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const payload = getPayload();
        if (!payload.name.trim()) return onError("Nhập tên trước đã");
        setBusy(true);
        try {
          const res = await fetch("/api/ai/seo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const j = await res.json().catch(() => null);
          if (!j?.ok) throw new Error(j?.error || "Không tạo được gợi ý");
          onResult(j);
        } catch (e: any) {
          onError(e?.message || "Lỗi gợi ý");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60"
      title="Gợi ý tiêu đề & mô tả SEO từ nội dung đang nhập"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
      Gợi ý
    </button>
  );
}
