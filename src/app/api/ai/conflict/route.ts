import { NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import type { AIConflictResponse } from '@/types';

interface ConflictRequestBody {
  currentDriverName: string;
  nextDriverName: string;
  spotTitle: string;
  spotAddress: string;
  extensionHours: number;
  currentBookingRate: number;
  nextBookingRate: number;
  currentDriverScore: number;
  nextDriverScore: number;
}

function deterministicFallback(body: ConflictRequestBody): AIConflictResponse {
  const basePenalty = body.currentBookingRate * body.extensionHours;
  const scoreRatio = body.currentDriverScore / Math.max(1, body.nextDriverScore);

  let compensation = Math.round(basePenalty * 0.5);
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';

  if (scoreRatio < 0.8) {
    // Current driver has lower score → higher penalty
    compensation = Math.round(basePenalty * 0.75);
    urgencyLevel = 'high';
  } else if (scoreRatio > 1.2) {
    compensation = Math.round(basePenalty * 0.3);
    urgencyLevel = 'low';
  }

  return {
    compensationAmount: compensation,
    compensationReason: `Based on extension of ${body.extensionHours}h at ₹${body.currentBookingRate}/hr with driver behavior scores considered.`,
    alternateSpotRecommendation: `Search for nearby spots within 2km of ${body.spotAddress} for the next driver.`,
    urgencyLevel,
    resolutionStrategy:
      urgencyLevel === 'high'
        ? 'Prioritize the next driver. Offer compensation and suggest the current driver vacate within 15 minutes.'
        : 'Negotiate extension with compensation to the next driver. Suggest alternate spots if available.',
  };
}

function parseGeminiJson(rawText: string): Partial<AIConflictResponse> | null {
  const trimmed = rawText.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Partial<AIConflictResponse>;
  } catch {
    return null;
  }
}

function sanitize(parsed: Partial<AIConflictResponse>): AIConflictResponse | null {
  if (typeof parsed.compensationAmount !== 'number') return null;
  if (typeof parsed.compensationReason !== 'string' || !parsed.compensationReason) return null;
  if (typeof parsed.alternateSpotRecommendation !== 'string') return null;
  if (!parsed.urgencyLevel || !['low', 'medium', 'high'].includes(parsed.urgencyLevel)) return null;
  if (typeof parsed.resolutionStrategy !== 'string' || !parsed.resolutionStrategy) return null;

  return {
    compensationAmount: Math.max(0, Math.round(parsed.compensationAmount)),
    compensationReason: parsed.compensationReason,
    alternateSpotRecommendation: parsed.alternateSpotRecommendation,
    urgencyLevel: parsed.urgencyLevel,
    resolutionStrategy: parsed.resolutionStrategy,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConflictRequestBody;

    if (!body.spotTitle || !body.extensionHours || body.extensionHours <= 0) {
      return NextResponse.json({ error: 'Invalid conflict request.' }, { status: 400 });
    }

    const prompt = `You are a conflict resolution AI for ParkShare, an urban parking marketplace in India.

A driver wants to extend their booking, but another driver has the next reservation at the same spot. Analyze the situation and return ONLY a valid JSON object with:
- compensationAmount (number, INR to offer the affected next driver)
- compensationReason (string, one sentence)
- alternateSpotRecommendation (string, suggestion for the next driver)
- urgencyLevel ("low" | "medium" | "high")
- resolutionStrategy (string, 2-3 sentences)

Context:
- Spot: "${body.spotTitle}" at ${body.spotAddress}
- Current driver: ${body.currentDriverName} (behavior score: ${body.currentDriverScore}/100)
- Next driver: ${body.nextDriverName} (behavior score: ${body.nextDriverScore}/100)
- Extension requested: ${body.extensionHours} hours
- Current booking rate: ₹${body.currentBookingRate}/hr
- Next booking rate: ₹${body.nextBookingRate}/hr`;

    try {
      const aiText = await callGemini(prompt);
      const parsed = parseGeminiJson(aiText);
      if (parsed) {
        const cleaned = sanitize(parsed);
        if (cleaned) return NextResponse.json(cleaned);
      }
    } catch {
      // Fall through to deterministic
    }

    return NextResponse.json(deterministicFallback(body));
  } catch {
    return NextResponse.json({ error: 'Unable to process conflict.' }, { status: 500 });
  }
}
