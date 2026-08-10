"use client";

import { useState } from "react";
import { ImageIcon, PlayCircle } from "lucide-react";
import WatermarkImage from "./WatermarkImage";

type Props = {
  mainImg: string | null;
  mainSrcSet?: string;
  productName: string;
  videoUrl?: string | null;
};

export default function ProductMedia({
  mainImg,
  mainSrcSet,
  productName,
  videoUrl,
}: Props) {
  const [tab, setTab] = useState<"image" | "video">("image");

  const hasVideo = Boolean(videoUrl);

  const isShort =
    videoUrl?.includes("shorts") ||
    videoUrl?.includes("tiktok") ||
    videoUrl?.includes("reel");

  const isVideoFile = videoUrl ? /\.(mp4|webm|ogg)$/i.test(videoUrl) : false;

  const embedUrl = videoUrl
    ? videoUrl.replace("youtu.be/", "youtube.com/embed/").replace("shorts/", "embed/")
    : "";

  return (
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
          mainImg ? (
            <WatermarkImage
              src={mainImg}
              srcSet={mainSrcSet}
              alt={productName}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-w-full max-h-full object-contain"
              watermarkSize={56}
              position="bottom-right"
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
                src={videoUrl!}
                controls
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}