"use client";

import { useState, useCallback, useRef } from "react";
import {
  processUploadedFile,
  exportToJSON,
  ProcessedQuestion,
} from "@/lib/triviaProcessor";

/* ─── Icons (inline SVG to keep zero extra deps) ──────── */
const Icon = {
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-green-400 shrink-0 mt-0.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  Warn: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-400 shrink-0 mt-0.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  Scissors: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 1 1.083-1.839c.005-.351.054-.695.14-1.024m0 0 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664" />
    </svg>
  ),
};

/* ─── Status config ──────────────────────────────────────── */
const STATUS = {
  ok:      { label: "OK",      badge: "bg-green-500/20 text-green-400 border-green-500/30",  Icon: Icon.Check },
  trimmed: { label: "Trimmed", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", Icon: Icon.Scissors },
  flagged: { label: "Flagged", badge: "bg-red-500/20 text-red-400 border-red-500/30",        Icon: Icon.Warn },
} as const;

/* ─── Main page ──────────────────────────────────────────── */
export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions]             = useState<ProcessedQuestion[]>([]);
  const [duplicatesRemoved, setDupsRemoved]   = useState(0);
  const [isDragging, setIsDragging]           = useState(false);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [toast, setToast]                     = useState<{ msg: string; err?: boolean } | null>(null);
  const [category, setCategory]               = useState("All");
  const [status, setStatus]                   = useState("All");
  const [search, setSearch]                   = useState("");

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 4000);
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const { questions: qs, duplicatesRemoved: dups } = await processUploadedFile(file);
      setQuestions(qs);
      setDupsRemoved(dups);
      setCategory("All");
      setStatus("All");
      setSearch("");
      showToast(`${qs.length} questions loaded — ${dups} duplicates removed`);
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const deleteQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id));

  const categories = ["All", ...Array.from(new Set(questions.map((q) => q.category))).sort()];
  const statuses   = ["All", "ok", "trimmed", "flagged"];

  const filtered = questions.filter((q) => {
    if (category !== "All" && q.category !== category) return false;
    if (status !== "All" && q.status !== status) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    ok:      questions.filter((q) => q.status === "ok").length,
    trimmed: questions.filter((q) => q.status === "trimmed").length,
    flagged: questions.filter((q) => q.status === "flagged").length,
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg border ${
          toast.err
            ? "bg-red-900/80 border-red-500/40 text-red-200"
            : "bg-green-900/80 border-green-500/40 text-green-200"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">TriviaSite</h1>
            <p className="text-xs text-white/40">Question Manager</p>
          </div>
        </div>
        {questions.length > 0 && (
          <button
            onClick={() => exportToJSON(questions)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Icon.Download />
            Export Clean JSON ({questions.filter((q) => q.status !== "flagged").length})
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all select-none ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.csv,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
          />
          <div className="text-white/30 flex justify-center mb-4">
            <Icon.Upload />
          </div>
          {isProcessing ? (
            <p className="text-white/60">Processing…</p>
          ) : (
            <>
              <p className="text-white/80 font-medium text-lg">Drop your file here or click to browse</p>
              <p className="text-white/40 text-sm mt-2">Supports .zip, .csv, and .json &nbsp;·&nbsp; Duplicates removed automatically</p>
            </>
          )}
        </div>

        {/* Stats */}
        {questions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total" value={questions.length} cls="border-blue-500/30 bg-blue-500/10 text-blue-300" />
            <StatCard label="OK" value={counts.ok} cls="border-green-500/30 bg-green-500/10 text-green-300" />
            <StatCard label="Trimmed" value={counts.trimmed} cls="border-yellow-500/30 bg-yellow-500/10 text-yellow-300" />
            <StatCard label="Flagged" value={counts.flagged} cls="border-red-500/30 bg-red-500/10 text-red-300" />
            {duplicatesRemoved > 0 && (
              <p className="col-span-full text-center text-sm text-white/40">
                {duplicatesRemoved} duplicate{duplicatesRemoved !== 1 ? "s" : ""} removed during processing
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        {questions.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"><Icon.Search /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                className="pl-9 pr-8 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 w-64"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                  <Icon.X />
                </button>
              )}
            </div>

            <FilterPills label="Category" options={categories} value={category} onChange={setCategory} />
            <FilterPills label="Status" options={statuses} value={status} onChange={setStatus} displayFn={(o) =>
              o === "ok" ? "OK" : o === "trimmed" ? "Trimmed" : o === "flagged" ? "Flagged" : o
            } />

            <span className="ml-auto text-white/40 text-sm">{filtered.length} shown</span>
          </div>
        )}

        {/* Question list */}
        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((q) => (
              <QuestionRow key={q.id} question={q} onDelete={deleteQuestion} />
            ))}
          </div>
        )}

        {questions.length > 0 && filtered.length === 0 && (
          <p className="text-center text-white/30 py-16">No questions match your filters.</p>
        )}
      </main>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`border rounded-xl p-4 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function FilterPills({
  label, options, value, onChange, displayFn,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  displayFn?: (o: string) => string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-white/40 text-sm">{label}:</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              value === opt
                ? "bg-white text-black"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
          >
            {displayFn ? displayFn(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuestionRow({
  question: q,
  onDelete,
}: {
  question: ProcessedQuestion;
  onDelete: (id: string) => void;
}) {
  const meta = STATUS[q.status];
  const StatusIcon = meta.Icon;

  return (
    <div className={`border rounded-xl p-4 transition-colors ${
      q.status === "flagged"
        ? "border-red-500/30 bg-red-500/5"
        : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
    }`}>
      <div className="flex items-start gap-3">
        <StatusIcon />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm leading-snug">{q.question}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-green-400 font-medium">✓ {q.correct_answer}</span>
            {q.incorrect_answers.map((a, i) => (
              <span key={i} className="text-white/40">✗ {a}</span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs border border-white/15 text-white/40 rounded px-2 py-0.5">{q.category}</span>
            <span className="text-xs border border-white/15 text-white/40 rounded px-2 py-0.5">{q.difficulty}</span>
            <span className={`text-xs border rounded px-2 py-0.5 ${meta.badge}`}>{meta.label}</span>
            {q.flagReason && <span className="text-red-400 text-xs">{q.flagReason}</span>}
          </div>
        </div>
        <button
          onClick={() => onDelete(q.id)}
          className="text-white/20 hover:text-red-400 transition-colors shrink-0 mt-0.5"
          title="Delete"
        >
          <Icon.Trash />
        </button>
      </div>
    </div>
  );
}
