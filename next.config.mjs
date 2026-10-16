/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Bắt mọi request vào www.mcbrother.com.vn
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.mcbrother.com.vn',
          },
        ],
        // Redirect 301 về bản non-www
        destination: 'https://mcbrother.com.vn/:path*',
        permanent: true,
      },
      {
        // URL danh mục cũ /danh-muc/<slug> → URL hiện tại /<slug> (301, giữ SEO)
        source: '/danh-muc/:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },

  images: {
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