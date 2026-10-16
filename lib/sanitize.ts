// lib/sanitize.ts
// Lọc HTML do admin nhập (mô tả sản phẩm, nội dung bài viết) trước khi render.
// Giữ định dạng của editor (bảng, ảnh, link, style inline…), bỏ <script>, onerror=, javascript:…
import DOMPurify from "isomorphic-dompurify";

import { isAllowedEmbed, isHttpUrl } from "./url";

export { isAllowedEmbed, isHttpUrl };

let hooked = false;
function setupHooks() {
  if (hooked) return;
  hooked = true;

  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    // Xoá iframe không thuộc danh sách tin cậy
    if (data.tagName === "iframe") {
      const el = node as Element;
      if (!isAllowedEmbed(el.getAttribute("src"))) el.parentNode?.removeChild(el);
    }
  });

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    // Link mở tab mới → thêm rel an toàn
    if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export function sanitizeHtml(html: string | null | undefined) {
  if (!html) return "";
  setupHooks();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  });
}