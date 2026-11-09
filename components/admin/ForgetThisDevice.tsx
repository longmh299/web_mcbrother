// components/admin/ForgetThisDevice.tsx
// Nút xoá các lượt xem đã lỡ ghi từ chính trình duyệt này (trước khi đăng nhập admin / thêm IP loại trừ).
"use client";

import { useEffect, useState } from "react";
import { deleteVisitorViews } from "@/app/admin/truy-cap/actions";

export default function ForgetThisDevice() {
  const [vid, setVid] = useState("");
  useEffect(() => {
    try {
      setVid(localStorage.getItem("mcb_vid") || "");
    } catch {}
  }, []);
  if (!vid) return null;

  return (
    <form
      action={deleteVisitorViews}
      onSubmit={(e) => {
        if (!confirm("Xoá toàn bộ lượt xem đã ghi từ trình duyệt này?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="vid" value={vid} />
      <button type="submit" className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline">
        Xoá lượt xem đã ghi từ máy này
      </button>
    </form>
  );
}
