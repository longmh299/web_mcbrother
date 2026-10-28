"use client";

import { useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import WatermarkImage from "./WatermarkImage";
import { isAllowedEmbed, isHttpUrl } from "@/lib/url";

type GalleryImage = { url: string; alt?: string | null };

type Props = {
  mainImg: string | null;
  mainSrcSet?: string;
  productName: string;
  videoUrl?: string | null;
  /** Ảnh phụ (thư viện ảnh) của sản phẩm, ngoài ảnh đại diện */
  images?: GalleryImage[];
};

export default function ProductMedia({
  mainImg,
  mainSrcSet,
  productName,
  videoUrl,
  images = [],
}: Props) {
  const [tab, setTab] = useState<"image" | "video">("image");

  // Gộp ảnh đại diện + ảnh phụ thành 1 danh sách duy nhất, bỏ trùng URL
  const gallery = useMemo<GalleryImage[]>(() => {
    const list: GalleryImage[] = [];
    if (mainImg) list.push({ url: mainImg, alt: productName });
    for (const img of images) {
      if (img?.url && !list.some((x) => x.url === img.url)) {
        list.push(img);
      }
    }
    return list;
  }, [mainImg, images, productName]);

  const [activeUrl, setActiveUrl] = useState<string | null>(mainImg ?? null);

  const active =
    gallery.find((g) => g.url === activeUrl) || gallery[0] || null;

  // Chỉ nhận link http(s); chặn "javascript:..." do nhập nhầm/cố ý ở admin
  const safeVideoUrl = isHttpUrl(videoUrl) ? videoUrl! : null;
  const hasVideo = Boolean(safeVideoUrl);

  const isShort =
    safeVideoUrl?.includes("shorts") ||
    safeVideoUrl?.includes("tiktok") ||
    safeVideoUrl?.includes("reel");

  const isVideoFile = safeVideoUrl ? /\.(mp4|webm|ogg)$/i.test(safeVideoUrl) : false;

  const embedUrl = safeVideoUrl
    ? safeVideoUrl.replace("youtu.be/", "youtube.com/embed/").replace("shorts/", "embed/")
    : "";
  // Chỉ nhúng iframe từ nguồn tin cậy (YouTube, Vimeo, Facebook…); nguồn khác hiện thành link
  const canEmbed = isAllowedEmbed(embedUrl);

  // Ảnh thu nhỏ cho ô "Video": lấy từ YouTube nếu có, không thì dùng ô tối có biểu tượng play
  const ytId = (() => {
    if (!safeVideoUrl) return null;
    const m =
      safeVideoUrl.match(/youtu\.be\/([\w-]{6,})/) ||
      safeVideoUrl.match(/[?&]v=([\w-]{6,})/) ||
      safeVideoUrl.match(/\/(?:embed|shorts)\/([\w-]{6,})/);
    return m ? m[1] : null;
  })();
  const videoThumb = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null;

  // Dải ảnh thu nhỏ hiện khi có từ 2 ảnh trở lên, hoặc khi sản phẩm có video
  const showStrip = gallery.length > 1 || hasVideo;

  return (
    <div className="space-y-3">
      {/* ===== KHUNG CHÍNH (không còn nút đè lên ảnh/video) ===== */}
      <div
        className={`relative flex [aspect-ratio:5/4] w-full items-center justify-center overflow-hidden rounded-[28px] ${
          tab === "image" ? "bg-white p-6 md:p-10" : "bg-[#111111]"
        }`}
      >
        {tab === "image" ? (
          active?.url ? (
            <WatermarkImage
              src={active.url}
              srcSet={active.url === mainImg ? mainSrcSet : undefined}
              alt={active.alt || productName}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-w-full max-h-full object-contain"
              watermarkSize={56}
              position="bottom-right"
              loading="eager"
              sizes="(min-width: 1024px) 600px, 100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">Chưa có ảnh</div>
          )
        ) : (
          // Video dọc (Shorts/TikTok/Reels) hiển thị khung dọc ở giữa, video ngang lấp đầy khung
          <div
            className="relative h-full"
            style={isShort ? { aspectRatio: "9 / 16", maxWidth: "100%" } : { width: "100%" }}
          >
            {isVideoFile ? (
              <video src={safeVideoUrl!} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
            ) : canEmbed ? (
              <iframe
                src={embedUrl}
                title={`Video ${productName}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a
                href={safeVideoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center text-white underline"
              >
                Xem video vận hành
              </a>
            )}
          </div>
        )}
      </div>

      {/* ===== DẢI ẢNH THU NHỎ + Ô VIDEO ===== */}
      {showStrip && (
        <div className="flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Ảnh và video sản phẩm">
          {gallery.map((img, i) => {
            const isActive = tab === "image" && active?.url === img.url;
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setTab("image");
                  setActiveUrl(img.url);
                }}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1.5 transition ${
                  isActive ? "border-[var(--color-ink)]" : "border-transparent hover:border-[var(--color-line)]"
                }`}
                aria-label={`Xem ảnh ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || productName} className="h-full w-full object-contain" />
              </button>
            );
          })}

          {hasVideo && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "video"}
              onClick={() => setTab("video")}
              aria-label="Xem video vận hành"
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[#111111] transition ${
                tab === "video" ? "border-[var(--color-primary)]" : "border-transparent hover:border-[var(--color-line)]"
              }`}
            >
              {videoThumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={videoThumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
              )}
              <span className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-white">
                <PlayCircle className="h-6 w-6" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Video</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}