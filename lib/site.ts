// lib/site.ts
export const SITE_URL =
  (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const abs = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// ===== THÔNG TIN CÔNG TY - nguồn dữ liệu chung, sửa 1 chỗ áp dụng toàn site =====
export const SITE = {
  name: "MCBROTHER JSC",
  legalName: "Công ty cổ phần thiết bị MCBROTHER",
  tagline: "Giải pháp máy chế biến & đóng gói cho doanh nghiệp sản xuất.",

  phone: "0834551888",
  phoneDisplay: "0834 551 888",
  email: "mcbrother2013@gmail.com",

  address: "33 đường số 5, KDC Vĩnh Lộc, Bình Hưng Hòa B, Bình Tân, TP.HCM",

  taxCode: "0312229437",
  taxCodeIssuedAt: "10/04/2013",

  zaloUrl: "https://zalo.me/0834551888",
  facebookUrl: "https://www.facebook.com/profile.php?id=100063588310367",
  youtubeUrl: "https://www.youtube.com/@mcbrotherjsc",
  tiktokUrl: "https://www.tiktok.com/@mcbrother.jsc",
} as const;