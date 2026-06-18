import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text, voice } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  // OpenAI TTS max is 4096 chars per request — chunk if needed
  const CHUNK_SIZE = 4000;
  const chunks: string[] = [];

  if (text.length <= CHUNK_SIZE) {
    chunks.push(text);
  } else {
    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > CHUNK_SIZE && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  try {
    const audioChunks: Buffer[] = [];

    for (const chunk of chunks) {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice || "alloy",
        input: chunk,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      audioChunks.push(buffer);
    }

    const combined = Buffer.concat(audioChunks);

    return new NextResponse(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="voiceover.mp3"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
