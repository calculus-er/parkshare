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
  startTimeMs?: number;
  endTimeMs?: number;
}

const validDemandLevels: DemandLevel[] = ['low', 'medium', 'high', 'very_high'];
const MIN_MARKUP_MULTIPLIER = 1.1; // keep at least 10% margin above owner base price
const MAX_DELTA_PER_REFRESH = 0.2; // avoid sudden jumps

type CachedPrice = {
  at: number;
  data: AIPricingResponse;
};

const priceCache = new Map<string, CachedPrice>();

function roundToNearest10(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10);
}

function toStableBucket(body: PricingRequestBody): string {
  const bucketTime = body.startTimeMs ? Math.floor(body.startTimeMs / (15 * 60 * 1000)) : body.timeOfDay;
  return [body.spotId, body.dayOfWeek, bucketTime].join(':');
}

function getSimulatedDemandSignal(lat: number, lng: number, dayOfWeek: string, timeOfDay: string): number {
  const seedBase = `${lat.toFixed(2)}-${lng.toFixed(2)}-${dayOfWeek}-${timeOfDay}`;
  let hash = 0;
  for (let i = 0; i < seedBase.length; i++) {
    hash = (hash * 31 + seedBase.charCodeAt(i)) % 100000;
  }
  // 0.00 - 0.35 synthetic demand uplift from local updates/events/news.
  return (hash % 35) / 100;
}

function applyStabilityWindow(cacheKey: string, current: AIPricingResponse): AIPricingResponse {
  const prev = priceCache.get(cacheKey);
  if (!prev) return current;
  if (Date.now() - prev.at > 15 * 60 * 1000) return current;

  const boundedMultiplier = Math.max(
    prev.data.surgeMultiplier - MAX_DELTA_PER_REFRESH,
    Math.min(prev.data.surgeMultiplier + MAX_DELTA_PER_REFRESH, current.surgeMultiplier)
  );

  return {
    ...current,
    surgeMultiplier: Number(boundedMultiplier.toFixed(2)),
  };
}

function deterministicFallback(
  baseRate: number,
  occupancyNearby: number,
  hasUpcomingBooking: boolean,
  demandSignal: number
): AIPricingResponse {
  const occupancyFactor = Math.min(Math.max(occupancyNearby, 0), 1);
  let surgeMultiplier = MIN_MARKUP_MULTIPLIER + occupancyFactor * 1.0 + demandSignal;

  if (hasUpcomingBooking) {
    surgeMultiplier += 0.1;
  }

  surgeMultiplier = Math.min(2.4, Math.max(MIN_MARKUP_MULTIPLIER, Number(surgeMultiplier.toFixed(2))));
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
    reasoning:
      demandLevel === 'very_high'
        ? 'Price is higher due to strong nearby occupancy and local peak-demand indicators.'
        : demandLevel === 'high'
          ? 'Price is moderately high due to rising occupancy and expected demand in this area.'
          : demandLevel === 'medium'
            ? 'Price is slightly above base to balance nearby demand and maintain availability.'
            : 'Price remains reasonable with only a light markup because local demand is currently softer.',
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
    surgeMultiplier: Math.min(2.4, Math.max(MIN_MARKUP_MULTIPLIER, Number(parsed.surgeMultiplier.toFixed(2)))),
    finalPrice: roundToNearest10(Math.max(baseRate * MIN_MARKUP_MULTIPLIER, parsed.finalPrice)),
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
    const demandSignal = getSimulatedDemandSignal(body.lat, body.lng, body.dayOfWeek, body.timeOfDay);
    const cacheKey = toStableBucket(body);

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
- Local updates/news demand signal (0-35%): ${(demandSignal * 100).toFixed(0)}%
- Upcoming booking conflict: ${body.hasUpcomingBooking}
- Location lat/lng: ${body.lat},${body.lng}`;

    try {
      const aiText = await callGemini(prompt);
      const parsed = parseGeminiJson(aiText);
      if (parsed) {
        const cleaned = sanitizeResponse(parsed, body.baseRate);
        if (cleaned) {
          const stable = applyStabilityWindow(cacheKey, cleaned);
          const response = {
            ...stable,
            finalPrice: roundToNearest10(Math.max(body.baseRate * MIN_MARKUP_MULTIPLIER, stable.finalPrice)),
          };
          priceCache.set(cacheKey, { at: Date.now(), data: response });
          return NextResponse.json(response);
        }
      }
    } catch {
      // Continue to deterministic fallback for reliability.
    }

    const fallback = deterministicFallback(
      body.baseRate,
      body.occupancyNearby,
      body.hasUpcomingBooking,
      demandSignal
    );
    const stableFallback = applyStabilityWindow(cacheKey, fallback);
    const response = {
      ...stableFallback,
      finalPrice: roundToNearest10(Math.max(body.baseRate * MIN_MARKUP_MULTIPLIER, stableFallback.finalPrice)),
    };
    priceCache.set(cacheKey, { at: Date.now(), data: response });
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Unable to process pricing request.' },
      { status: 500 }
    );
  }
}
