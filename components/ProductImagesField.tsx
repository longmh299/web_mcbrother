'use client';

import { useState } from 'react';
import UploadImage from '@/components/UploadImage';

export type GalleryImageInput = { url: string; alt: string };

type Props = {
  /** Tên field khi submit form (JSON string của mảng ảnh) */
  name: string;
  initialImages?: GalleryImageInput[];
  folder?: string;
};

export default function ProductImagesField({
  name,
  initialImages = [],
  folder,
}: Props) {
  const [images, setImages] = useState<GalleryImageInput[]>(initialImages);
  const [urlInput, setUrlInput] = useState('');

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    setImages((arr) => [...arr, { url: u, alt: '' }]);
    setUrlInput('');
  };

  const addUploaded = (u: string) => {
    setImages((arr) => [...arr, { url: u, alt: '' }]);
  };

  const removeAt = (i: number) =>
    setImages((arr) => arr.filter((_, idx) => idx !== i));

  const updateAlt = (i: number, alt: string) =>
    setImages((arr) =>
      arr.map((img, idx) => (idx === i ? { ...img, alt } : img))
    );

  const move = (i: number, dir: -1 | 1) =>
    setImages((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="space-y-3">
      {/* dữ liệu thật gửi lên server action */}
      <input type="hidden" name={name} value={JSON.stringify(images)} readOnly />

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              className="border rounded-xl overflow-hidden bg-white shadow-sm"
            >
              <div className="relative aspect-square bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt || ''}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="p-2 space-y-1.5">
                <input
                  value={img.alt}
                  onChange={(e) => updateAlt(i, e.target.value)}
                  placeholder="ALT (mô tả ảnh)"
                  className="w-full border rounded px-2 py-1 text-xs"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-30"
                      title="Lên trước"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === images.length - 1}
                      className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-30"
                      title="Xuống sau"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="text-red-600 text-xs"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Dán URL ảnh rồi bấm Thêm URL"
          className="border rounded px-3 py-2 flex-1 min-w-[220px] text-sm"
        />
        <button
          type="button"
          onClick={addUrl}
          className="border rounded px-3 py-2 text-sm"
        >
          + Thêm URL
        </button>
        <UploadImage
          name={`${name}_upload`}
          folder={folder}
          onUploaded={addUploaded}
          buttonLabel="Tải ảnh từ máy"
        />
      </div>

      <p className="text-xs opacity-60">
        Ảnh đầu tiên trong danh sách sẽ hiển thị ngay sau ảnh đại diện ở trang chi tiết sản phẩm.
        Có thể thêm nhiều ảnh, sắp xếp lại bằng nút ↑ ↓, hoặc xoá.
      </p>
    </div>
  );
}