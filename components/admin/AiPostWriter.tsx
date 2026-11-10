// components/admin/AiPostWriter.tsx
// Khung "✨ AI viết bài" trong form bài viết: gợi ý chủ đề kéo traffic → AI viết trọn bài chuẩn SEO
// (tiêu đề, sapo, nội dung có link + ảnh sản phẩm thật, câu hỏi thường gặp, SEO title/description, tags).
// Chỉ điền vào form — admin đọc lại, sửa, rồi mới bấm Lưu / Đăng.
"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { btnCls, inputCls } from "./ui";

export type AiPostResult = {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  categoryId: number | null;
  content: string;
};

type Idea = { keyword: string; title: string; type: string; why: string };

const TYPE_LABEL: Record<string, string> = {
  guide: "Hướng dẫn / kiến thức",
  buying: "Tư vấn chọn mua",
  compare: "So sánh",
  list: "Danh sách (Top / X cách)",
  application: "Ứng dụng theo ngành",
  news: "Tin tức / xu hướng",
};
const HISTORY_KEY = "mcb_ai_ideas_shown";
const HISTORY_MAX = 80;
const LENGTH_LABEL: Record<string, string> = { short: "Ngắn (~800 từ)", medium: "Vừa (~1.300 từ)", long: "Dài (~1.800 từ)" };

export default function AiPostWriter({
  postId,
  hasContent,
  onResult,
  onError,
}: {
  postId?: number;
  hasContent: boolean;
  onResult: (r: AiPostResult, usedProducts: { slug: string; name: string }[]) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(!postId && !hasContent);
  const [keyword, setKeyword] = useState("");
  const [extra, setExtra] = useState("");
  const [type, setType] = useState("guide");
  const [length, setLength] = useState("medium");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [focus, setFocus] = useState("");
  const [focusCats, setFocusCats] = useState<string[]>([]);
  // các chủ đề đã gợi ý trước đó (lưu trên trình duyệt) → gửi lên để AI không lặp lại
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(v)) setHistory(v.filter((x) => typeof x === "string").slice(-HISTORY_MAX));
    } catch {}
  }, []);
  const saveHistory = (list: string[]) => {
    const v = list.slice(-HISTORY_MAX);
    setHistory(v);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(v));
    } catch {}
  };
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function write() {
    if (busy) return;
    if (keyword.trim().length < 3) return onError("Nhập chủ đề / từ khoá chính trước.");
    if (hasContent && !confirm("AI sẽ thay toàn bộ tiêu đề, nội dung và phần SEO đang có trong form. Tiếp tục?")) return;
    setBusy(true);
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      const res = await fetch("/api/ai/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, extraKeywords: extra, type, length, notes, postId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || (res.status === 504 ? "Quá thời gian chờ, thử độ dài ngắn hơn." : `Lỗi ${res.status}`));
      onResult(j.post, j.usedProducts || []);
      setOpen(false);
    } catch (e: any) {
      onError(e?.message || "AI lỗi, thử lại.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  }

  async function suggest() {
    if (ideasBusy) return;
    setIdeasBusy(true);
    try {
      const res = await fetch("/api/ai/post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, exclude: history.slice(-HISTORY_MAX) }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || `Lỗi ${res.status}`);
      setIdeas(j.ideas);
      setFocusCats(Array.isArray(j.focusCats) ? j.focusCats : []);
      saveHistory([...history, ...j.ideas.map((i: Idea) => i.title)]);
    } catch (e: any) {
      onError(e?.message || "AI lỗi, thử lại.");
    } finally {
      setIdeasBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btnCls.secondary} w-full justify-center border-violet-300 text-violet-700 hover:bg-violet-50`}>
        <Sparkles size={16} /> AI viết bài
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Sparkles size={18} className="text-violet-600" /> AI viết bài chuẩn SEO
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Dùng thông số & ảnh sản phẩm thật trên web, tự gắn link về trang sản phẩm. Bài chỉ điền vào form — bạn đọc lại rồi mới Lưu.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className={btnCls.icon} aria-label="Thu gọn" disabled={busy}>
          <X size={16} />
        </button>
      </div>

      {/* ----- gợi ý chủ đề ----- */}
      <div className="mb-4 rounded-lg border border-dashed border-violet-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-slate-700">Chưa biết viết gì?</span>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Tập trung vào… (VD: máy đóng gói cà phê) — để trống cũng được"
            className={`${inputCls} min-w-0 flex-1 !py-1.5 text-sm`}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), suggest())}
          />
          <button type="button" onClick={suggest} disabled={ideasBusy || busy} className={btnCls.secondary}>
            {ideasBusy ? <Loader2 size={15} className="animate-spin" /> : <Lightbulb size={15} />}
            {ideasBusy ? "Đang nghĩ…" : ideas.length ? "Gợi ý khác" : "Gợi ý chủ đề"}
          </button>
        </div>
        {(focusCats.length > 0 || history.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{focusCats.length > 0 && <>Lượt này xoay vào: {focusCats.join(", ")}. Bấm “Gợi ý khác” để sang danh mục khác.</>}</span>
            {history.length > 0 && (
              <button
                type="button"
                className="text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                title="AI đang tránh lặp lại các chủ đề đã gợi ý. Xoá để cho phép gợi ý lại."
                onClick={() => saveHistory([])}
              >
                Đã gợi ý {history.length} chủ đề · xoá lịch sử
              </button>
            )}
          </div>
        )}
        {ideas.length > 0 && (
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
            {ideas.map((i) => (
              <li key={i.keyword + i.title}>
                <button
                  type="button"
                  onClick={() => {
                    setKeyword(i.keyword);
                    setType(i.type);
                    setNotes((n) => (n ? n : `Tiêu đề gợi ý: ${i.title}`));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition hover:border-violet-300 hover:bg-violet-50 ${
                    keyword === i.keyword ? "border-violet-400 bg-violet-50" : "border-slate-200"
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">{i.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>
                      Từ khoá: <b className="font-medium text-slate-700">{i.keyword}</b>
                    </span>
                    <span>{TYPE_LABEL[i.type]}</span>
                  </div>
                  {i.why && <div className="mt-0.5 text-xs text-slate-400">{i.why}</div>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ----- yêu cầu viết ----- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Từ khoá chính *</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="VD: máy hàn miệng túi tự động"
            className={inputCls}
            maxLength={150}
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Từ khoá phụ <span className="font-normal text-slate-400">(tuỳ chọn, cách nhau dấu phẩy)</span>
          </span>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="VD: máy hàn túi có in date, máy hàn túi liên tục" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Loại bài</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Độ dài</span>
          <select value={length} onChange={(e) => setLength(e.target.value)} className={inputCls}>
            {Object.entries(LENGTH_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Yêu cầu thêm <span className="font-normal text-slate-400">(tuỳ chọn)</span>
          </span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: nhấn mạnh phù hợp xưởng nhỏ, nhắc có lắp đặt tận nơi ở miền Nam, giọng văn gần gũi…"
            className={inputCls}
            maxLength={1200}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={write} disabled={busy} className={`${btnCls.primary} bg-violet-600 hover:bg-violet-700`}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy ? `AI đang viết… ${elapsed}s` : hasContent ? "Viết lại bằng AI" : "Viết bài"}
        </button>
        {busy && <span className="text-xs text-slate-500">Bài dài mất khoảng 20–50 giây, đừng đóng trang.</span>}
      </div>
    </div>
  );
}
