"use client";

import { useState } from "react";

/* ─── Types ──────────────────────────────────────────────── */
interface ScriptSection {
  heading: string;
  narration: string;
}

interface VideoScript {
  title: string;
  hook: string;
  sections: ScriptSection[];
  outro: string;
  fullScript: string;
  estimatedDuration: string;
  tags: string[];
}

type Step = "input" | "script" | "audio";
type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
type Style = "educational" | "entertaining" | "countdown";
type Duration = "short" | "medium" | "long";

const VOICES: { id: Voice; label: string; desc: string }[] = [
  { id: "alloy",   label: "Alloy",   desc: "Neutral, balanced" },
  { id: "echo",    label: "Echo",    desc: "Warm, male" },
  { id: "fable",   label: "Fable",   desc: "Expressive, British" },
  { id: "onyx",    label: "Onyx",    desc: "Deep, authoritative" },
  { id: "nova",    label: "Nova",    desc: "Energetic, female" },
  { id: "shimmer", label: "Shimmer", desc: "Soft, female" },
];

/* ─── Page ───────────────────────────────────────────────── */
export default function Home() {
  // Step
  const [step, setStep] = useState<Step>("input");

  // Input state
  const [topic, setTopic]           = useState("");
  const [rawContent, setRawContent] = useState("");
  const [style, setStyle]           = useState<Style>("educational");
  const [duration, setDuration]     = useState<Duration>("medium");

  // Script state
  const [script, setScript]         = useState<VideoScript | null>(null);
  const [editedScript, setEditedScript] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);

  // Audio state
  const [voice, setVoice]           = useState<Voice>("alloy");
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl]     = useState<string | null>(null);

  // Toast
  const [toast, setToast]           = useState<{ msg: string; err?: boolean } | null>(null);

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Generate script ── */
  const generateScript = async () => {
    if (!rawContent.trim()) { showToast("Add some content first", true); return; }
    setGeneratingScript(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, rawContent, style, duration }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScript(data.script);
      setEditedScript(data.script.fullScript);
      setStep("script");
      setAudioUrl(null);
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setGeneratingScript(false);
    }
  };

  /* ── Generate audio ── */
  const generateAudio = async () => {
    if (!editedScript.trim()) { showToast("No script to convert", true); return; }
    setGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editedScript, voice }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStep("audio");
    } catch (e) {
      showToast(String(e), true);
    } finally {
      setGeneratingAudio(false);
    }
  };

  /* ── Download helpers ── */
  const downloadScript = () => {
    if (!script) return;
    const text = [
      `TITLE: ${script.title}`,
      `ESTIMATED DURATION: ${script.estimatedDuration}`,
      `TAGS: ${script.tags.join(", ")}`,
      "",
      "=== HOOK ===",
      script.hook,
      "",
      ...script.sections.flatMap((s) => [`=== ${s.heading.toUpperCase()} ===`, s.narration, ""]),
      "=== OUTRO ===",
      script.outro,
      "",
      "=== FULL SCRIPT (NARRATION ONLY) ===",
      editedScript,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${script.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_script.txt`;
    a.click();
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "voiceover.mp3";
    a.click();
  };

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-xl border max-w-sm ${
          toast.err
            ? "bg-red-900/90 border-red-500/40 text-red-100"
            : "bg-green-900/90 border-green-500/40 text-green-100"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">TriviaSite</h1>
            <p className="text-xs text-white/40">AI Video Script Generator</p>
          </div>
        </div>
        {/* Progress steps */}
        <div className="flex items-center gap-2 text-sm">
          {(["input", "script", "audio"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-white/20">→</span>}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                step === s
                  ? "bg-white text-black"
                  : (step === "script" && s === "input") || step === "audio"
                  ? "bg-white/20 text-white/70"
                  : "text-white/30"
              }`}>
                {s === "input" ? "1. Input" : s === "script" ? "2. Script" : "3. Voiceover"}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">What&apos;s the video about?</h2>
              <p className="text-white/40 text-sm">Paste your raw facts, trivia questions, notes — anything. Claude will turn it into a polished script.</p>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-sm text-white/60 font-medium">Topic / Title hint <span className="text-white/30">(optional)</span></label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 10 insane World Cup facts"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-white/40 text-sm"
              />
            </div>

            {/* Raw content */}
            <div className="space-y-1.5">
              <label className="text-sm text-white/60 font-medium">Raw content <span className="text-red-400">*</span></label>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder={"Paste your raw facts, bullet points, trivia questions, research notes…\n\n- In 1990, Cameroon beat Argentina in the opening match\n- Roger Milla was 38 years old and danced by the corner flag\n- West Germany beat Argentina 1-0 in the final…"}
                rows={12}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 text-sm font-mono resize-y leading-relaxed"
              />
              <p className="text-right text-xs text-white/25">{rawContent.length} chars</p>
            </div>

            {/* Style + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/60 font-medium">Style</label>
                <div className="flex flex-col gap-2">
                  {(["educational", "entertaining", "countdown"] as Style[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-4 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                        style === s
                          ? "border-white/60 bg-white/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/70"
                      }`}
                    >
                      {s === "educational" ? "📚 Educational" : s === "entertaining" ? "🎉 Entertaining" : "🔢 Countdown list"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60 font-medium">Target length</label>
                <div className="flex flex-col gap-2">
                  {([["short", "⚡ Short", "60–90 sec"], ["medium", "▶ Medium", "3–5 min"], ["long", "📹 Long", "8–12 min"]] as [Duration, string, string][]).map(([d, label, sub]) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                        duration === d
                          ? "border-white/60 bg-white/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/70"
                      }`}
                    >
                      {label} <span className="text-white/30 text-xs ml-1">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={generateScript}
              disabled={generatingScript || !rawContent.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generatingScript ? (
                <>
                  <Spinner /> Generating script with Claude…
                </>
              ) : (
                "✨ Generate Video Script →"
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: SCRIPT ── */}
        {step === "script" && script && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{script.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-white/40">
                  <span>⏱ {script.estimatedDuration}</span>
                  <span>·</span>
                  <span>{script.tags.map((t) => `#${t}`).join(" ")}</span>
                </div>
              </div>
              <button
                onClick={() => setStep("input")}
                className="text-white/40 hover:text-white text-sm transition-colors shrink-0"
              >
                ← Edit input
              </button>
            </div>

            {/* Script breakdown */}
            <div className="space-y-3">
              <ScriptBlock label="HOOK" color="blue" text={script.hook} />
              {script.sections.map((s, i) => (
                <ScriptBlock key={i} label={s.heading} color="white" text={s.narration} />
              ))}
              <ScriptBlock label="OUTRO" color="purple" text={script.outro} />
            </div>

            {/* Editable full script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/60 font-medium">Full narration script <span className="text-white/30">(edit before generating audio)</span></label>
                <span className="text-xs text-white/25">{editedScript.length} chars</span>
              </div>
              <textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                rows={14}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/40 text-sm font-mono resize-y leading-relaxed"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadScript}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm transition-colors"
              >
                ⬇ Download script (.txt)
              </button>
              <button
                onClick={generateScript}
                disabled={generatingScript}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm transition-colors disabled:opacity-40"
              >
                {generatingScript ? <><Spinner /> Regenerating…</> : "↺ Regenerate"}
              </button>
              <button
                onClick={() => setStep("audio")}
                className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                Generate Voiceover →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: AUDIO ── */}
        {step === "audio" && script && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Generate Voiceover</h2>
              <button onClick={() => setStep("script")} className="text-white/40 hover:text-white text-sm transition-colors">
                ← Back to script
              </button>
            </div>

            {/* Voice picker */}
            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium">Voice</label>
              <div className="grid grid-cols-3 gap-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                      voice === v.id
                        ? "border-white/60 bg-white/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{v.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Script preview */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-white/40 mb-2 font-medium">SCRIPT TO CONVERT</p>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{editedScript}</p>
            </div>

            <button
              onClick={generateAudio}
              disabled={generatingAudio}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generatingAudio ? (
                <><Spinner /> Generating audio… this may take a moment</>
              ) : (
                "🎙 Generate Voiceover MP3"
              )}
            </button>

            {/* Audio result */}
            {audioUrl && (
              <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-5 space-y-4">
                <p className="text-green-400 font-medium text-sm">✓ Voiceover ready!</p>
                <audio controls src={audioUrl} className="w-full" />
                <div className="flex gap-3">
                  <button
                    onClick={downloadAudio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
                  >
                    ⬇ Download MP3
                  </button>
                  <button
                    onClick={downloadScript}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm transition-colors"
                  >
                    ⬇ Download script
                  </button>
                  <button
                    onClick={() => { setStep("input"); setScript(null); setAudioUrl(null); setRawContent(""); setTopic(""); }}
                    className="ml-auto px-4 py-2.5 rounded-lg border border-white/10 text-white/40 hover:text-white text-sm transition-colors"
                  >
                    Start new video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Small components ───────────────────────────────────── */

function ScriptBlock({ label, color, text }: { label: string; color: "blue" | "white" | "purple"; text: string }) {
  const colors = {
    blue:   "border-blue-500/30 bg-blue-500/5 text-blue-300",
    white:  "border-white/10 bg-white/5 text-white/50",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-300",
  };
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <p className={`text-xs font-bold tracking-widest mb-2 ${colors[color]}`}>{label}</p>
      <p className="text-white/80 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3-3H4z" />
    </svg>
  );
}
