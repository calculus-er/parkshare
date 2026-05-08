import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import type { AIDamageResponse } from '@/types';

interface DamageRequestBody {
  bookingId: string;
  entryVideoURL: string | null;
  exitVideoURL: string | null;
  driverNote: string;
}

function deterministicFallback(note: string): AIDamageResponse {
  const text = note.toLowerCase();
  const severe = /(major|dent|crack|broken|severe)/.test(text);
  const minor = /(scratch|minor|scuff|mark)/.test(text);

  if (severe) {
    return {
      damageDetected: true,
      confidenceScore: 82,
      suspectedDamageAreas: ['front bumper', 'left panel'],
      severity: 'severe',
      estimatedRepairCost: 12000,
      recommendation: 'investigate',
      aiRemarks: 'Reported indicators suggest significant external impact. Escalated review is recommended before settlement.',
    };
  }

  if (minor) {
    return {
      damageDetected: true,
      confidenceScore: 68,
      suspectedDamageAreas: ['rear bumper'],
      severity: 'minor',
      estimatedRepairCost: 2500,
      recommendation: 'investigate',
      aiRemarks: 'Likely surface-level damage based on driver note. Compare entry and exit recordings for confirmation.',
    };
  }

  return {
    damageDetected: false,
    confidenceScore: 40,
    suspectedDamageAreas: [],
    severity: 'none',
    estimatedRepairCost: 0,
    recommendation: 'dismiss',
    aiRemarks: 'Insufficient evidence of damage from the provided complaint details.',
  };
}

function parseGeminiJson(rawText: string): Partial<AIDamageResponse> | null {
  const trimmed = rawText.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Partial<AIDamageResponse>;
  } catch {
    return null;
  }
}

function sanitize(parsed: Partial<AIDamageResponse>): AIDamageResponse | null {
  if (typeof parsed.damageDetected !== 'boolean') return null;
  if (typeof parsed.confidenceScore !== 'number') return null;
  if (!Array.isArray(parsed.suspectedDamageAreas)) return null;
  if (!parsed.severity || !['none', 'minor', 'moderate', 'severe'].includes(parsed.severity)) return null;
  if (typeof parsed.estimatedRepairCost !== 'number') return null;
  if (!parsed.recommendation || !['dismiss', 'investigate', 'compensate'].includes(parsed.recommendation)) return null;
  if (typeof parsed.aiRemarks !== 'string' || !parsed.aiRemarks) return null;

  return {
    damageDetected: parsed.damageDetected,
    confidenceScore: Math.max(0, Math.min(100, Math.round(parsed.confidenceScore))),
    suspectedDamageAreas: parsed.suspectedDamageAreas.map((x) => String(x)),
    severity: parsed.severity,
    estimatedRepairCost: Math.max(0, Math.round(parsed.estimatedRepairCost)),
    recommendation: parsed.recommendation,
    aiRemarks: parsed.aiRemarks,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DamageRequestBody;
    if (!body.bookingId || !body.driverNote?.trim()) {
      return NextResponse.json({ error: 'Invalid damage request.' }, { status: 400 });
    }

    const prompt = `You are ParkShare's AI damage verification system.
A driver has raised a damage complaint after parking.

Return ONLY a valid JSON object with:
- damageDetected (boolean)
- confidenceScore (number 0-100)
- suspectedDamageAreas (array of strings)
- severity ("none" | "minor" | "moderate" | "severe")
- estimatedRepairCost (number in INR)
- recommendation ("dismiss" | "investigate" | "compensate")
- aiRemarks (string, 2-3 sentences)

Context:
- Booking ID: ${body.bookingId}
- Entry video URL: ${body.entryVideoURL || 'not_provided'}
- Exit video URL: ${body.exitVideoURL || 'not_provided'}
- Driver note: "${body.driverNote}"`;

    try {
      const aiText = await callGemini(prompt);
      const parsed = parseGeminiJson(aiText);
      if (parsed) {
        const cleaned = sanitize(parsed);
        if (cleaned) {
          return NextResponse.json(cleaned);
        }
      }
    } catch {
      // Fall back to deterministic response.
    }

    return NextResponse.json(deterministicFallback(body.driverNote));
  } catch {
    return NextResponse.json({ error: 'Unable to process damage report.' }, { status: 500 });
  }
}
