// components/admin/SeoBoard.tsx
// Bảng kiểm tra SEO: lọc theo lỗi, sửa nhanh tiêu đề / mô tả, gợi ý bằng AI (từng mục hoặc hàng loạt).
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, Pencil, Save, Sparkles, X } from "lucide-react";
import { applySeo } from "@/app/admin/seo/actions";
import { ISSUE_LABEL, scoreTone, TITLE_MAX, DESC_MAX, DESC_MIN, type IssueCode, type SeoIssue } from "@/lib/seo-audit";
import { CharCount, Toast, btnCls, inputCls, useToast } from "./ui";

export type SeoRow = {
  id: number;
  kind: "product" | "post";
  name: string;
  editHref: string;
  publicHref: string;
  metaTitle: string;
  metaDescription: string;
  short: string;
  contentText: string;
  category: string | null;
  specs: string;
  score: number;
  googleTitle: string;
  googleDesc: string;
  issues: SeoIssue[];
};

type Draft = { metaTitle: string; metaDescription: string; short?: string; source?: "ai" | "rule"; aiError?: string };

const LEVEL_CLS = {
  error: "bg-red-50 text-red-700 ring-red-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-slate-50 text-slate-600 ring-slate-200",
};

/** Lỗi mà AI sửa được (tiêu đề / mô tả / mô tả ngắn) */
const FIXABLE: IssueCode[] = ["title_missing", "title_long", "title_short", "title_dup", "desc_missing", "desc_long", "desc_short", "desc_dup", "short_missing"];

const brand = (t: string) => (/mcbrother/i.test(t) ? t : `${t} | MCBROTHER`);

export default function SeoBoard({ rows, kind, initialIssue }: { rows: SeoRow[]; kind: "product" | "post"; initialIssue?: string }) {
  const router = useRouter();
  const { toast, setToast } = useToast();
  const [filter, setFilter] = useState<IssueCode | "all" | "bad">(
    initialIssue && initialIssue in ISSUE_LABEL ? (initialIssue as IssueCode) : "all"
  );
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [busy, setBusy] = useState<Record<number, "ai" | "save" | undefined>>({});
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  // ---- thống kê lỗi ----
  const counts = useMemo(() => {
    const m = new Map<IssueCode, number>();
    rows.forEach((r) => r.issues.forEach((i) => m.set(i.code, (m.get(i.code) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 100;
  const bad = rows.filter((r) => r.score < 60).length;

  const visible = useMemo(
    () =>
      rows
        .filter((r) => (filter === "all" ? true : filter === "bad" ? r.score < 60 : r.issues.some((i) => i.code === filter)))
        .sort((a, b) => a.score - b.score),
    [rows, filter]
  );

  const draftOf = (r: SeoRow): Draft => drafts[r.id] ?? { metaTitle: r.metaTitle, metaDescription: r.metaDescription };
  const setDraft = (id: number, d: Partial<Draft>) =>
    setDrafts((s) => ({ ...s, [id]: { ...(s[id] ?? { metaTitle: "", metaDescription: "" }), ...d } }));

  async function suggest(r: SeoRow, silent = false) {
    setBusy((b) => ({ ...b, [r.id]: "ai" }));
    try {
      const res = await fetch("/api/ai/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: r.kind,
          name: r.name,
          category: r.category,
          short: r.short,
          content: r.contentText,
          specs: r.specs,
          avoidTitles: rows.filter((x) => x.id !== r.id).map((x) => x.googleTitle).slice(0, 30),
        }),
      });
      const j = await res.json().catch(() => null);
      if (!j?.ok) throw new Error(j?.error || "Không tạo được gợi ý");
      setDrafts((s) => ({
        ...s,
        [r.id]: { metaTitle: j.metaTitle, metaDescription: j.metaDescription, short: j.short, source: j.source, aiError: j.aiError },
      }));
      setOpen((o) => ({ ...o, [r.id]: true }));
      return true;
    } catch (e: any) {
      if (!silent) setToast({ type: "error", text: e?.message || "Lỗi gợi ý" });
      return false;
    } finally {
      setBusy((b) => ({ ...b, [r.id]: undefined }));
    }
  }

  async function save(r: SeoRow, silent = false) {
    const d = draftOf(r);
    setBusy((b) => ({ ...b, [r.id]: "save" }));
    const patch: Record<string, string> = { metaTitle: d.metaTitle, metaDescription: d.metaDescription };
    if (d.short !== undefined) patch.short = d.short;
    const res = await applySeo(r.kind, r.id, patch);
    setBusy((b) => ({ ...b, [r.id]: undefined }));
    if (!res.ok) {
      if (!silent) setToast({ type: "error", text: res.error || "Lưu thất bại" });
      return false;
    }
    setDrafts((s) => {
      const n = { ...s };
      delete n[r.id];
      return n;
    });
    setOpen((o) => ({ ...o, [r.id]: false }));
    if (!silent) {
      setToast({ type: "success", text: "Đã lưu" });
      router.refresh();
    }
    return true;
  }

  // ---- hàng loạt ----
  const fixable = visible.filter((r) => r.issues.some((i) => FIXABLE.includes(i.code))).slice(0, 20);
  const pendingSave = visible.filter((r) => drafts[r.id]?.source);

  async function bulkSuggest() {
    setBulk({ done: 0, total: fixable.length });
    let ok = 0;
    for (const [i, r] of fixable.entries()) {
      if (await suggest(r, true)) ok++;
      setBulk({ done: i + 1, total: fixable.length });
    }
    setBulk(null);
    setToast({ type: "success", text: `Đã tạo ${ok} gợi ý — xem lại rồi bấm “Lưu tất cả”` });
  }
  async function bulkSave() {
    if (!confirm(`Lưu ${pendingSave.length} gợi ý vào website?`)) return;
    setBulk({ done: 0, total: pendingSave.length });
    let ok = 0;
    for (const [i, r] of pendingSave.entries()) {
      if (await save(r, true)) ok++;
      setBulk({ done: i + 1, total: pendingSave.length });
    }
    setBulk(null);
    setToast({ type: "success", text: `Đã lưu ${ok} mục` });
    router.refresh();
  }

  const noun = kind === "product" ? "sản phẩm" : "bài viết";

  return (
    <div className="space-y-5">
      {/* ===== Tổng quan ===== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Điểm SEO trung bình</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-slate-900">{avg}</span>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${avg >= 85 ? "bg-emerald-500" : avg >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${avg}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFilter("bad")}
          className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:border-red-300 ${filter === "bad" ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"}`}
        >
          <div className="text-sm font-medium text-slate-500">Cần sửa gấp (dưới 60 điểm)</div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-red-600">{bad}</div>
          <div className="mt-1 text-xs text-slate-500">/ {rows.length} {noun} đang hiển thị</div>
        </button>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Sửa nhanh bằng AI</div>
          <p className="mt-1 text-xs text-slate-500">
            Tạo gợi ý tiêu đề & mô tả cho tối đa 20 {noun} đang lọc. Bạn xem lại, chỉnh rồi mới lưu.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={bulkSuggest} disabled={!!bulk || !fixable.length} className={btnCls.primary}>
              {bulk ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {bulk ? `Đang xử lý ${bulk.done}/${bulk.total}` : `Gợi ý cho ${fixable.length} mục`}
            </button>
            {pendingSave.length > 0 && !bulk && (
              <button type="button" onClick={bulkSave} className={btnCls.secondary}>
                <Save size={16} /> Lưu tất cả ({pendingSave.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Lọc theo lỗi ===== */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${filter === "all" ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}
        >
          Tất cả ({rows.length})
        </button>
        {counts.map(([code, n]) => (
          <button
            key={code}
            type="button"
            onClick={() => setFilter(code)}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${filter === code ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"}`}
          >
            {ISSUE_LABEL[code]} <span className="tabular-nums opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {/* ===== Danh sách ===== */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không có {noun} nào trong mục này 🎉</p>}
        <ul className="divide-y divide-slate-100">
          {visible.map((r) => {
            const d = draftOf(r);
            const isOpen = !!open[r.id];
            const hasDraft = !!drafts[r.id];
            const gTitle = brand(d.metaTitle || r.name);
            const gDesc = d.metaDescription || r.googleDesc;
            return (
              <li key={r.id} className={hasDraft ? "bg-violet-50/40" : ""}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex h-9 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${scoreTone(r.score)}`}>
                    {r.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                      className="line-clamp-1 text-left font-medium text-slate-900 hover:text-blue-700"
                    >
                      {r.name}
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.issues.map((i) => (
                        <span key={i.code} title={i.detail} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${LEVEL_CLS[i.level]}`}>
                          {ISSUE_LABEL[i.code]}
                        </span>
                      ))}
                      {!r.issues.length && <span className="text-xs text-emerald-600">Không có lỗi</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => suggest(r)}
                      disabled={!!busy[r.id] || !!bulk}
                      className={`${btnCls.ghost} text-violet-700 hover:bg-violet-50`}
                      title="Gợi ý tiêu đề & mô tả bằng AI"
                    >
                      {busy[r.id] === "ai" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      <span className="hidden sm:inline">Gợi ý</span>
                    </button>
                    <button type="button" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))} className={btnCls.icon} title="Sửa nhanh">
                      <ChevronDown size={18} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:pl-[72px]">
                    <div className="space-y-3">
                      {/* chi tiết lỗi */}
                      {r.issues.length > 0 && (
                        <ul className="space-y-0.5 text-xs text-slate-600">
                          {r.issues.map((i) => (
                            <li key={i.code}>
                              • <strong>{ISSUE_LABEL[i.code]}:</strong> {i.detail}
                            </li>
                          ))}
                        </ul>
                      )}
                      {d.source && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                          <Sparkles size={13} />
                          {d.source === "ai"
                            ? "Gợi ý từ AI — hãy đọc lại trước khi lưu"
                            : d.aiError && d.aiError !== "no-key"
                              ? `Gợi ý tự động — AI lỗi: ${d.aiError}`
                              : "Gợi ý tự động (server web chưa có ANTHROPIC_API_KEY)"}
                        </div>
                      )}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Tiêu đề SEO</label>
                          <span className="text-xs text-slate-500">
                            Hiển thị: <CharCount value={gTitle} min={40} max={TITLE_MAX} />
                          </span>
                        </div>
                        <input value={d.metaTitle} onChange={(e) => setDraft(r.id, { metaTitle: e.target.value })} placeholder={r.name} className={inputCls} />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Mô tả SEO</label>
                          <CharCount value={d.metaDescription} min={DESC_MIN} max={DESC_MAX} />
                        </div>
                        <textarea
                          rows={3}
                          value={d.metaDescription}
                          onChange={(e) => setDraft(r.id, { metaDescription: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      {d.short !== undefined && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            {kind === "product" ? "Mô tả ngắn (đang trống)" : "Sapo (đang trống)"}
                          </label>
                          <textarea rows={4} value={d.short} onChange={(e) => setDraft(r.id, { short: e.target.value })} className={inputCls} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => save(r)} disabled={!!busy[r.id]} className={btnCls.primary}>
                          {busy[r.id] === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu
                        </button>
                        {hasDraft && (
                          <button
                            type="button"
                            className={btnCls.secondary}
                            onClick={() =>
                              setDrafts((s) => {
                                const n = { ...s };
                                delete n[r.id];
                                return n;
                              })
                            }
                          >
                            <X size={16} /> Bỏ thay đổi
                          </button>
                        )}
                        <Link href={r.editHref} className={btnCls.secondary}>
                          <Pencil size={16} /> Sửa đầy đủ
                        </Link>
                        <a href={r.publicHref} target="_blank" rel="noreferrer" className={btnCls.secondary}>
                          <ExternalLink size={16} /> Xem
                        </a>
                      </div>
                    </div>

                    {/* xem trước Google */}
                    <div className="self-start rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Xem trước trên Google</div>
                      <div className="truncate text-xs text-slate-500">mcbrother.com.vn{r.publicHref}</div>
                      <div className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">
                        {gTitle.length > TITLE_MAX ? gTitle.slice(0, TITLE_MAX - 1) + "…" : gTitle}
                      </div>
                      <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-slate-600">{gDesc || "—"}</div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}