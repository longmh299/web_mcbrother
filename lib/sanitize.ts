// lib/sanitize.ts
// Lọc HTML do admin nhập (mô tả sản phẩm, nội dung bài viết) trước khi render.
// Dùng sanitize-html (thuần JS) — KHÔNG dùng isomorphic-dompurify/jsdom vì jsdom
// bị crash trên Vercel (thiếu file default-stylesheet.css khi đóng gói) → lỗi 500.
import sanitize from "sanitize-html";
import { EMBED_HOSTS, isAllowedEmbed, isHttpUrl } from "./url";

export { isAllowedEmbed, isHttpUrl };

type Options = {
  /** Giữ thuộc tính style="" inline (mặc định: có). Nội dung bài viết thì tắt để tránh vỡ layout. */
  allowStyle?: boolean;
};

export function sanitizeHtml(html: string | null | undefined, opts: Options = {}) {
  if (!html) return "";
  const { allowStyle = true } = opts;

  const common = ["class", "id", "title", ...(allowStyle ? ["style"] : [])];

  return sanitize(html, {
    allowedTags: [
      ...sanitize.defaults.allowedTags, // p, ul, ol, li, table, strong, em, a, blockquote, h3-h6…
      "h1",
      "h2",
      "img",
      "iframe",
      "span",
      "figure",
      "figcaption",
      "video",
      "source",
    ],
    allowedAttributes: {
      "*": common,
      a: [...common, "href", "target", "rel", "name"],
      img: [...common, "src", "srcset", "sizes", "alt", "width", "height", "loading"],
      iframe: [
        ...common,
        "src",
        "width",
        "height",
        "allow",
        "allowfullscreen",
        "frameborder",
        "loading",
        "referrerpolicy",
      ],
      video: [...common, "src", "controls", "poster", "width", "height", "preload"],
      source: ["src", "type"],
      td: [...common, "colspan", "rowspan", "align", "valign", "width"],
      th: [...common, "colspan", "rowspan", "align", "valign", "width", "scope"],
      table: [...common, "border", "cellpadding", "cellspacing", "width"],
    },
    // Chặn javascript:, vbscript:… — chỉ cho các scheme an toàn
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    // iframe chỉ từ nguồn video tin cậy (YouTube, Vimeo, Facebook…)
    allowedIframeHostnames: EMBED_HOSTS,
    allowIframeRelativeUrls: false,
    transformTags: {
      // Link mở tab mới → thêm rel an toàn
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}