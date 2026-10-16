"use client";

import { useMemo, useState } from "react";
import { ImageIcon, PlayCircle } from "lucide-react";
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

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        {/* ===== TABS ===== */}
        {hasVideo && (
          <div className="flex border-b bg-gray-50">
            <button
              type="button"
              onClick={() => setTab("image")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
                tab === "image"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Hình ảnh
            </button>

            <button
              type="button"
              onClick={() => setTab("video")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
                tab === "video"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              Video
            </button>
          </div>
        )}

        {/* ===== CONTENT ===== */}
        <div className="relative w-full aspect-[4/3] bg-white overflow-hidden flex items-center justify-center">
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
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )
          ) : (
            <div
              className="relative w-full h-full bg-black"
              style={isShort ? { maxWidth: 420, margin: "0 auto" } : undefined}
            >
              {isVideoFile ? (
                <video
                  src={safeVideoUrl!}
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : canEmbed ? (
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
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
      </div>

      {/* ===== THUMBNAILS (chỉ hiện khi có từ 2 ảnh trở lên) ===== */}
      {tab === "image" && gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((img, i) => {
            const isActive = active?.url === img.url;
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setActiveUrl(img.url)}
                className={`shrink-0 w-16 h-16 rounded-lg border overflow-hidden bg-gray-50 transition ${
                  isActive
                    ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
                    : "border-gray-200 hover:border-[var(--color-primary)]/50"
                }`}
                aria-label={`Xem ảnh ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt || productName}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}