// components/ClickTracker.tsx
// Tự bắt mọi cú bấm vào link Gọi / Zalo / Messenger / Email / Liên hệ trên toàn website,
// không cần sửa từng nút. Gắn 1 lần trong layout (chỉ ở phần website, không ở admin).
"use client";

import { useEffect } from "react";
import { classifyHref, trackLead } from "@/lib/track";

export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const type = classifyHref(a.getAttribute("href") || "");
      if (!type) return;
      const label = (a.dataset.track || a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim();
      // Link "Liên hệ" trên menu chỉ là chuyển trang, không phải khách bấm báo giá → bỏ qua
      if (type === "quote" && /^liên hệ$/i.test(label)) return;
      trackLead(type, label);
    };
    // capture: bắt được cả khi nút khác chặn sự kiện
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
