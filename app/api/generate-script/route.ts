import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { topic, rawContent, style, duration } = await req.json();

  if (!rawContent?.trim()) {
    return NextResponse.json({ error: "No content provided" }, { status: 400 });
  }

  const durationGuide: Record<string, string> = {
    short: "60–90 seconds (about 150–220 words of narration)",
    medium: "3–5 minutes (about 450–750 words of narration)",
    long: "8–12 minutes (about 1200–1800 words of narration)",
  };

  const styleGuide: Record<string, string> = {
    educational: "informative and authoritative, like a documentary narrator",
    entertaining: "upbeat, punchy and engaging — short sentences, energy",
    countdown: "countdown format (e.g. '10 Things You Didn't Know About…')",
  };

  const prompt = `You are a professional YouTube scriptwriter. Turn the raw content below into a complete, ready-to-narrate YouTube video script.

Topic: ${topic || "inferred from content"}
Target length: ${durationGuide[duration] || durationGuide.medium}
Tone/Style: ${styleGuide[style] || styleGuide.educational}

Raw content to work with:
${rawContent}

Return ONLY valid JSON with this exact shape (no markdown, no code blocks):
{
  "title": "YouTube video title (clickable, SEO-friendly)",
  "hook": "Opening 1-2 sentences to grab attention immediately",
  "sections": [
    {
      "heading": "Section title (for reference, not read aloud)",
      "narration": "The full narration text for this section, written to be spoken naturally"
    }
  ],
  "outro": "Closing narration — recap, CTA to like/subscribe/comment",
  "fullScript": "The complete narration joined together: hook + all section narrations + outro. Ready to paste into a TTS tool.",
  "estimatedDuration": "e.g. '4 minutes'",
  "tags": ["youtube", "tag1", "tag2", "tag3", "tag4"]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const script = JSON.parse(text);

    return NextResponse.json({ script });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
  }
}
