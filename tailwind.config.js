// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // cho phép bật dark mode theo class
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      // gutter hiện đại: 16px mobile, 24px desktop
      padding: { DEFAULT: "16px", lg: "24px" },
      // mở rộng khung nội dung tới 1600px cho màn lớn
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1600px", // <- rộng hơn để hết cảm giác "khuôn bé"
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A7282",
          foreground: "#ffffff",
        },
        accent: "#D9A400",
        surface: "#F6F4EF", // nền kem ấm
        ink: "#111111",
        sand: "#EAE6DD",
        line: "#D6D1C6",
        muted: "#55524C",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
        "card-hover":
          "0 6px 16px rgba(16,24,40,.10), 0 2px 6px rgba(16,24,40,.06)",
      },
      fontFamily: {
        // nếu dùng next/font Inter: className="font-sans"
        // Font nạp bằng next/font trong app/layout.tsx (có hỗ trợ tiếng Việt)
        sans: ["var(--font-sans)", "Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        // Tiêu đề lớn: Inter Tight, chữ khít kiểu tối giản
        display: ["var(--font-display)", "var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        "soft-out": "cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
  ],
};
