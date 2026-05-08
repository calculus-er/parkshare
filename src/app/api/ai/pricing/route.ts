import { NextResponse } from 'next/server';
import type { AIPricingResponse, DemandLevel } from '@/types';
import { callGemini } from '@/lib/gemini';

interface PricingRequestBody {
  spotId: string;
  baseRate: number;
  lat: number;
  lng: number;
  timeOfDay: string;
  dayOfWeek: string;
  occupancyNearby: number;
  hasUpcomingBooking: boolean;
}

const validDemandLevels: DemandLevel[] = ['low', 'medium', 'high', 'very_high'];

function roundToNearest10(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10);
}

function deterministicFallback(
  baseRate: number,
  occupancyNearby: number,
  hasUpcomingBooking: boolean
): AIPricingResponse {
  const occupancyFactor = Math.min(Math.max(occupancyNearby, 0), 1);
  let surgeMultiplier = 1 + occupancyFactor * 1.5;

  if (hasUpcomingBooking) {
    surgeMultiplier += 0.2;
  }

  surgeMultiplier = Math.min(3, Math.max(1, Number(surgeMultiplier.toFixed(2))));
  const finalPrice = roundToNearest10(baseRate * surgeMultiplier);

  const demandLevel: DemandLevel =
    surgeMultiplier >= 2.4 ? 'very_high' :
    surgeMultiplier >= 1.8 ? 'high' :
    surgeMultiplier >= 1.3 ? 'medium' :
    'low';

  return {
    surgeMultiplier,
    finalPrice,
    demandLevel,
    reasoning: hasUpcomingBooking
      ? 'High nearby demand and a possible timing conflict increased the suggested hourly rate.'
      : 'Price is adjusted by nearby occupancy to reflect expected local demand.',
  };
}

function parseGeminiJson(rawText: string): Partial<AIPricingResponse> | null {
  const trimmed = rawText.trim();
  const directStart = trimmed.indexOf('{');
  const directEnd = trimmed.lastIndexOf('}');
  if (directStart === -1 || directEnd === -1 || directEnd <= directStart) {
    return null;
  }

  const jsonSlice = trimmed.slice(directStart, directEnd + 1);
  try {
    return JSON.parse(jsonSlice) as Partial<AIPricingResponse>;
  } catch {
    return null;
  }
}

function sanitizeResponse(parsed: Partial<AIPricingResponse>, baseRate: number): AIPricingResponse | null {
  if (typeof parsed.surgeMultiplier !== 'number') return null;
  if (typeof parsed.finalPrice !== 'number') return null;
  if (typeof parsed.reasoning !== 'string' || !parsed.reasoning.trim()) return null;
  if (!parsed.demandLevel || !validDemandLevels.includes(parsed.demandLevel)) return null;

  return {
    surgeMultiplier: Math.min(3, Math.max(1, Number(parsed.surgeMultiplier.toFixed(2)))),
    finalPrice: roundToNearest10(Math.max(baseRate, parsed.finalPrice)),
    reasoning: parsed.reasoning.trim(),
    demandLevel: parsed.demandLevel,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PricingRequestBody;

    if (!body || typeof body.baseRate !== 'number' || body.baseRate <= 0) {
      return NextResponse.json(
        { error: 'Invalid pricing input: baseRate is required and must be positive.' },
        { status: 400 }
      );
    }

    const prompt = `You are a smart parking pricing AI for ParkShare, an urban parking marketplace in India.
Given the following context, calculate a dynamic price multiplier (between 1.0 and 3.0) and return ONLY a valid JSON object with these fields:
- surgeMultiplier (number)
- finalPrice (number, baseRate × surgeMultiplier, rounded to nearest 10)
- reasoning (string, one sentence explaining why)
- demandLevel ("low" | "medium" | "high" | "very_high")

Context:
- Spot ID: ${body.spotId}
- Base rate: ₹${body.baseRate}/hr
- Time: ${body.timeOfDay} on ${body.dayOfWeek}
- Nearby occupancy: ${Math.round(body.occupancyNearby * 100)}%
- Upcoming booking conflict: ${body.hasUpcomingBooking}
- Location lat/lng: ${body.lat},${body.lng}`;

    try {
      const aiText = await callGemini(prompt);
      const parsed = parseGeminiJson(aiText);
      if (parsed) {
        const cleaned = sanitizeResponse(parsed, body.baseRate);
        if (cleaned) {
          return NextResponse.json(cleaned);
        }
      }
    } catch {
      // Continue to deterministic fallback for reliability.
    }

    return NextResponse.json(
      deterministicFallback(body.baseRate, body.occupancyNearby, body.hasUpcomingBooking)
    );
  } catch {
    return NextResponse.json(
      { error: 'Unable to process pricing request.' },
      { status: 500 }
    );
  }
}
