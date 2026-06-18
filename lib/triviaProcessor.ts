import JSZip from "jszip";
import Papa from "papaparse";

export interface RawQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty?: string;
  [key: string]: unknown;
}

export interface ProcessedQuestion {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[]; // always exactly 2
  category: string;
  difficulty: string;
  status: "ok" | "trimmed" | "flagged";
  flagReason?: string;
}

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function processQuestion(raw: RawQuestion): ProcessedQuestion {
  const incorrects = Array.isArray(raw.incorrect_answers)
    ? raw.incorrect_answers.map(String)
    : [];

  if (incorrects.length < 2) {
    return {
      id: uid(),
      question: raw.question,
      correct_answer: raw.correct_answer,
      incorrect_answers: incorrects,
      category: raw.category || "Uncategorised",
      difficulty: raw.difficulty || "medium",
      status: "flagged",
      flagReason: `Only ${incorrects.length} incorrect answer(s) — needs at least 2`,
    };
  }

  if (incorrects.length === 2) {
    return {
      id: uid(),
      question: raw.question,
      correct_answer: raw.correct_answer,
      incorrect_answers: incorrects,
      category: raw.category || "Uncategorised",
      difficulty: raw.difficulty || "medium",
      status: "ok",
    };
  }

  // >2 incorrect — randomly keep 2
  const shuffled = [...incorrects].sort(() => Math.random() - 0.5);
  return {
    id: uid(),
    question: raw.question,
    correct_answer: raw.correct_answer,
    incorrect_answers: shuffled.slice(0, 2),
    category: raw.category || "Uncategorised",
    difficulty: raw.difficulty || "medium",
    status: "trimmed",
    flagReason: `Had ${incorrects.length} incorrect answers — randomly kept 2`,
  };
}

function deduplicate(qs: ProcessedQuestion[]): ProcessedQuestion[] {
  const seen = new Set<string>();
  return qs.filter((q) => {
    const key = normalise(q.question);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normaliseRaw(obj: Record<string, unknown>): RawQuestion | null {
  const question = String(obj.question ?? obj.Question ?? obj.q ?? "").trim();
  if (!question) return null;

  const correct = String(
    obj.correct_answer ?? obj.correctAnswer ?? obj.answer ?? obj.correct ?? ""
  ).trim();
  if (!correct) return null;

  let incorrects: string[] = [];
  if (Array.isArray(obj.incorrect_answers)) {
    incorrects = obj.incorrect_answers.map(String);
  } else if (Array.isArray(obj.incorrectAnswers)) {
    incorrects = (obj.incorrectAnswers as unknown[]).map(String);
  } else {
    incorrects = (["option_a", "option_b", "option_c", "option_d", "A", "B", "C", "D"] as const)
      .map((k) => String(obj[k] ?? "").trim())
      .filter(Boolean)
      .filter((o) => normalise(o) !== normalise(correct));
  }

  return {
    question,
    correct_answer: correct,
    incorrect_answers: incorrects,
    category: String(obj.category ?? obj.Category ?? obj.topic ?? "Uncategorised").trim(),
    difficulty: String(obj.difficulty ?? obj.Difficulty ?? "medium").trim(),
  };
}

async function parseJSON(text: string): Promise<RawQuestion[]> {
  const data = JSON.parse(text);
  const arr: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.questions)
    ? data.questions
    : [];
  return arr
    .map((r) => normaliseRaw(r as Record<string, unknown>))
    .filter(Boolean) as RawQuestion[];
}

async function parseCSV(text: string): Promise<RawQuestion[]> {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data
    .map((r) => normaliseRaw(r as Record<string, unknown>))
    .filter(Boolean) as RawQuestion[];
}

async function parseFile(name: string, text: string): Promise<RawQuestion[]> {
  if (name.endsWith(".json")) return parseJSON(text);
  if (name.endsWith(".csv")) return parseCSV(text);
  return [];
}

export async function processUploadedFile(
  file: File
): Promise<{ questions: ProcessedQuestion[]; duplicatesRemoved: number }> {
  let raws: RawQuestion[] = [];

  if (file.name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(file);
    for (const entry of Object.values(zip.files)) {
      if (!entry.dir) {
        const text = await entry.async("text");
        raws = raws.concat(await parseFile(entry.name, text));
      }
    }
  } else {
    raws = await parseFile(file.name, await file.text());
  }

  const processed = raws.map(processQuestion);
  const deduped = deduplicate(processed);
  return { questions: deduped, duplicatesRemoved: processed.length - deduped.length };
}

export function exportToJSON(questions: ProcessedQuestion[]): void {
  const exportable = questions
    .filter((q) => q.status !== "flagged")
    .map(({ id: _id, status: _s, flagReason: _f, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trivia_questions_clean.json";
  a.click();
  URL.revokeObjectURL(url);
}
