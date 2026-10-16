'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const NewsEditorClient = dynamic(
  () => import('./NewsEditor.client'),
  { ssr: false }
);

type Props = {
  name?: string;
  value?: string;
  onChange?: (html: string) => void;
  height?: number;
  placeholder?: string;
  className?: string;
  /** Ẩn phần kiểm tra SEO / xem trước / hướng dẫn bên dưới (form mới tự hiển thị ở cột phải) */
  bare?: boolean;
};

export default function NewsEditor(props: Props) {
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [content, setContent] = useState(props.value || '');

  // ===== CLEAN HTML (client-side basic) =====
  const cleanHTML = (html: string) => {
    if (!html) return '';

    return html
      // remove inline style
      .replace(/ style="[^"]*"/g, '')
      // remove span
      .replace(/<\/?span[^>]*>/g, '')
      // remove empty tags
      .replace(/<p>\s*<\/p>/g, '')
      // normalize strong
      .replace(/<b>/g, '<strong>')
      .replace(/<\/b>/g, '</strong>')
      // remove H1
      .replace(/<h1[^>]*>/gi, '<h2>')
      .replace(/<\/h1>/gi, '</h2>');
  };

  // ===== MARKDOWN → HTML nhẹ =====
  const markdownToHtml = (text: string) => {
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\n/g, '<p></p>');
  };

  // ===== HANDLE CHANGE =====
  const handleChange = (html: string) => {
    const cleaned = cleanHTML(html);
    setContent(cleaned);
    props.onChange?.(cleaned);
  };

  // ===== INSERT BLOCK SAFE =====
  const insertBlock = (html: string) => {
    // @ts-ignore
    const editor = window?.tinymce?.activeEditor;
    if (!editor) return;

    editor.insertContent(cleanHTML(html));
  };

  // ===== TEMPLATE =====
  const insertTemplate = () => {
    insertBlock(`
      <h2>Giới thiệu</h2>
      <p>...</p>

      <h2>Ưu điểm</h2>
      <ul>
        <li>...</li>
      </ul>

      <h2>Kết luận</h2>
      <p>...</p>
    `);
  };

  // ===== SEO ANALYSIS =====
  const analysis = useMemo(() => {
    return {
      hasH2: /<h2/i.test(content),
      hasList: /<ul|<ol/i.test(content),
      hasImage: /<img/i.test(content),
      length: content.replace(/<[^>]+>/g, '').length,
    };
  }, [content]);

  return (
    <div className={props.className}>

      {/* ===== HIDDEN INPUT: bắt buộc để form submit được content ===== */}
      {props.name && (
        <input type="hidden" name={props.name} value={content} />
      )}

      {/* ===== TOOLBAR ===== */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Btn onClick={insertTemplate}>📄 Template</Btn>

        <Btn onClick={() => insertBlock('<h2>Tiêu đề</h2><p>Nội dung...</p>')}>
          + H2
        </Btn>

        <Btn onClick={() => insertBlock('<ul><li>Item 1</li></ul>')}>
          + List
        </Btn>

        <Btn onClick={() => insertBlock('<div class="note-box">Ghi chú</div>')}>
          + Note
        </Btn>

        <Btn onClick={() => insertBlock('<div class="cta-box">CTA</div>')}>
          + CTA
        </Btn>
      </div>

      {/* ===== EDITOR ===== */}
      <NewsEditorClient
        apiKey={apiKey!}
        {...props}
        value={content}
        onChange={handleChange}
        height={props.height ?? 420}
        placeholder={
          props.placeholder ??
          'Dán từ ChatGPT → hệ thống sẽ tự clean & format'
        }
      />

      {!props.bare && (
        <>
      {/* ===== SEO CHECK ===== */}
      <div className="mt-4 text-xs space-y-1">
        {!analysis.hasH2 && (
          <p className="text-red-500">⚠️ Thiếu H2</p>
        )}

        {!analysis.hasList && (
          <p className="text-yellow-500">⚠️ Nên thêm list</p>
        )}

        {!analysis.hasImage && (
          <p className="text-yellow-500">⚠️ Nên có ảnh</p>
        )}

        {analysis.length < 300 && (
          <p className="text-yellow-500">⚠️ Nội dung ngắn</p>
        )}
      </div>

      {/* ===== PREVIEW SAFE ===== */}
      <div className="mt-6 border rounded-xl p-4 bg-white">
        <div className="font-semibold mb-3">👀 Preview</div>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: cleanHTML(content) }}
        />
      </div>

      {/* ===== GUIDELINE ===== */}
      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <p>• Paste từ ChatGPT sẽ auto clean</p>
        <p>• Chỉ dùng H2 / H3</p>
        <p>• Tránh style inline</p>
        <p>• Nên có list + ảnh</p>
      </div>
        </>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
    >
      {children}
    </button>
  );
}
