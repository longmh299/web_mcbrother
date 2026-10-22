/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ẩn header "X-Powered-By: Next.js"
  poweredByHeader: false,

  async redirects() {
    return [
      {
        // Bắt mọi request vào www.mcbrother.com.vn → redirect 301 về bản non-www
        source: '/:path*',
        has: [{ type: 'host', value: 'www.mcbrother.com.vn' }],
        destination: 'https://mcbrother.com.vn/:path*',
        permanent: true,
      },
      {
        // URL danh mục cũ /danh-muc/<slug> → URL hiện tại /<slug>
        source: '/danh-muc/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        // URL sản phẩm .html của website cũ → /san-pham/<slug>
        // Bắt được cả các dạng:
        //   /san-pham/<sp>.html
        //   /san-pham/<danh-muc>/<sp>.html
        //   /san-pham/<danh-muc>/san-pham/<sp>.html   (link tương đối lỗi của site cũ)
        // Nếu slug cũ đã đổi tên, trang /san-pham/[slug] tự tra bảng slugRedirect để chuyển tiếp.
        source: '/san-pham/:path*/:prod([^/.]+).html',
        destination: '/san-pham/:prod',
        permanent: true,
      },
    ];
  },

  images: {
    // Ưu tiên AVIF (nhẹ hơn), fallback WebP
    formats: ['image/avif', 'image/webp'],
    // Chỉ tối ưu ảnh từ các nguồn tin cậy (không dùng hostname '*').
    // Nếu terminal báo: hostname "abc.com" is not configured → thêm 1 dòng cho domain đó.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'mcbrother.net' },
      { protocol: 'https', hostname: 'mcbrother.com.vn' },
    ],
  },
};

export default nextConfig;
