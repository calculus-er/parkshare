'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SpotWithStatus } from '@/types';
import { formatDistance, getETAMinutes } from '@/lib/mapbox';
import {
  X,
  MapPin,
  Shield,
  Zap,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Sparkles,
  Search,
  Star,
  Users,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

interface ListingDetailModalProps {
  spot: SpotWithStatus | null;
  onClose: () => void;
  bookingWindowStart: string;
  bookingWindowEnd: string;
  onUpdateBookingWindow: (start: string, end: string) => void;
  onChangeLocation: () => void;
  onBook?: (spot: SpotWithStatus, startTimeMs: number, endTimeMs: number, aiPrice: number) => void;
}

export default function ListingDetailModal({
  spot,
  onClose,
  bookingWindowStart,
  bookingWindowEnd,
  onUpdateBookingWindow,
  onChangeLocation,
  onBook,
}: ListingDetailModalProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [startInput, setStartInput] = useState(bookingWindowStart);
  const [endInput, setEndInput] = useState(bookingWindowEnd);
  const [aiPrice, setAiPrice] = useState<{
    finalPrice: number;
    surgeMultiplier: number;
    reasoning: string;
    demandLevel: string;
  } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  useEffect(() => {
    setCurrentImage(0);
  }, [spot?.spotId]);

  const etaMinutes = spot ? getETAMinutes(spot.distanceKm) : 0;
  const startMs = new Date(startInput).getTime();
  const endMs = new Date(endInput).getTime();
  const durationHours = Math.max(0, (endMs - startMs) / (60 * 60 * 1000));

  useEffect(() => {
    if (!spot) return;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      setLoadingPrice(false);
      return;
    }
    const fetchPrice = async () => {
      setLoadingPrice(true);
      try {
        const bookingStart = new Date(startMs);
        const res = await fetch('/api/ai/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spotId: spot.spotId,
            baseRate: spot.baseHourlyRate,
            lat: spot.latitude,
            lng: spot.longitude,
            timeOfDay: `${bookingStart.getHours()}:${String(bookingStart.getMinutes()).padStart(2, '0')}`,
            dayOfWeek: bookingStart.toLocaleDateString('en-US', { weekday: 'long' }),
            occupancyNearby: 0.6 + Math.random() * 0.3,
            hasUpcomingBooking: spot.markerColor === 'yellow',
            startTimeMs: startMs,
            endTimeMs: endMs,
          }),
        });
        const data = await res.json();
        if (data.finalPrice) {
          setAiPrice(data);
        } else {
          setAiPrice({
            finalPrice: spot.baseHourlyRate,
            surgeMultiplier: 1.0,
            reasoning: 'Base rate applied — AI pricing will activate when Gemini API is connected.',
            demandLevel: 'medium',
          });
        }
      } catch {
        setAiPrice({
          finalPrice: spot.baseHourlyRate,
          surgeMultiplier: 1.0,
          reasoning: 'Using base rate.',
          demandLevel: 'low',
        });
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchPrice();
  }, [spot, startMs, endMs]);

  useEffect(() => {
    setStartInput(bookingWindowStart);
    setEndInput(bookingWindowEnd);
  }, [bookingWindowStart, bookingWindowEnd]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  if (!spot) return null;

  const demandColors: Record<string, string> = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    very_high: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const effectivePrice = aiPrice?.finalPrice ?? spot.aiPricePerHour ?? Math.round(spot.baseHourlyRate * 1.1);
  const totalAmount = effectivePrice * durationHours;

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-detail-title"
    >
      <div
        role="presentation"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl max-h-[min(92vh,880px)] overflow-y-auto bg-[#0a0a0a] border border-white/[0.12] shadow-2xl rounded-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/50 border border-white/15 flex items-center justify-center rounded-sm hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Gallery — capped height so it feels like a listing hero, not full-screen */}
        {spot.images.length > 0 ? (
          <div className="relative w-full aspect-video max-h-[min(42vh,280px)] bg-black/60 overflow-hidden">
            <div
              className="flex h-full transition-transform duration-300"
              style={{ transform: `translateX(-${currentImage * 100}%)` }}
            >
              {spot.images.map((img, i) => (
                <div key={i} className="min-w-full h-full shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {spot.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImage((p) => Math.max(0, p - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 border border-white/10 flex items-center justify-center rounded-sm"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImage((p) => Math.min(spot.images.length - 1, p + 1))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 border border-white/10 flex items-center justify-center rounded-sm"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {spot.images.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/35'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video max-h-[min(42vh,280px)] bg-white/[0.04] flex items-center justify-center border-b border-white/[0.06]">
            <MapPin className="w-10 h-10 text-white/15" />
          </div>
        )}

        <div className="px-5 sm:px-7 pb-6 pt-5 space-y-5">
          <div>
            <h2 id="listing-detail-title" className="text-white text-xl font-light tracking-wide pr-10">
              {spot.title}
            </h2>
            <p className="text-white/35 text-sm flex items-start gap-2 mt-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/25" />
              <span>{spot.address}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm border border-white/[0.06] bg-white/[0.02] px-4 py-3 rounded-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#00d4ff]">{formatDistance(spot.distanceKm)} away</span>
              <span className="text-white/35 text-xs">~{etaMinutes} min drive (est.)</span>
            </div>
            {spot.averageRating > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 text-sm pt-1 border-t border-white/[0.06]">
                <Star className="w-4 h-4 fill-amber-400/30" />
                <span>{spot.averageRating.toFixed(1)}</span>
                <span className="text-white/25 text-xs">guest rating</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-white/40 text-xs pt-1 border-t border-white/[0.06]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Space open {spot.availableFrom}–{spot.availableTo} (owner hours)
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>
                {spot.totalSpots} simultaneous vehicle{spot.totalSpots !== 1 ? 's' : ''} at this listing
              </span>
            </div>
          </div>

          {spot.description?.trim() ? (
            <div>
              <p className="text-white/45 text-[10px] uppercase tracking-wider mb-2">About this space</p>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{spot.description}</p>
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            {spot.vehicleTypes.map((vt) => (
              <span
                key={vt}
                className="px-2.5 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 uppercase tracking-wider rounded-sm"
              >
                {vt}
              </span>
            ))}
            {spot.isCovered && (
              <span className="px-2.5 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 flex items-center gap-1 rounded-sm">
                <Shield className="w-3 h-3" /> Covered
              </span>
            )}
            {spot.hasEVCharging && (
              <span className="px-2.5 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 flex items-center gap-1 rounded-sm">
                <Zap className="w-3 h-3" /> EV
              </span>
            )}
            {spot.hasCCTV && (
              <span className="px-2.5 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 flex items-center gap-1 rounded-sm">
                <Eye className="w-3 h-3" /> CCTV
              </span>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-white/45 text-[10px] tracking-wider uppercase">AI Price</span>
              </div>
              {aiPrice && (
                <span
                  className={`self-start px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${
                    demandColors[aiPrice.demandLevel] || demandColors.medium
                  }`}
                >
                  {aiPrice.demandLevel.replace('_', ' ')} demand
                </span>
              )}
            </div>
            {loadingPrice ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : aiPrice ? (
              <>
                <p className="text-white text-2xl font-light">
                  ₹{aiPrice.finalPrice}
                  <span className="text-white/35 text-base">/hr</span>
                  {aiPrice.surgeMultiplier > 1 && (
                    <span className="text-amber-400 text-xs ml-2">{aiPrice.surgeMultiplier.toFixed(1)}× surge</span>
                  )}
                </p>
                <p className="text-white/30 text-[11px] italic mt-2 leading-relaxed">{aiPrice.reasoning}</p>
              </>
            ) : null}
          </div>

          <div>
            <p className="text-white/45 text-[10px] tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Your booking window
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartInput(value);
                  onUpdateBookingWindow(value, endInput);
                }}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#00d4ff]/30 rounded-sm"
              />
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setEndInput(value);
                  onUpdateBookingWindow(startInput, value);
                }}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#00d4ff]/30 rounded-sm"
              />
            </div>
            <button
              type="button"
              onClick={onChangeLocation}
              className="mt-3 text-[10px] uppercase tracking-wider text-[#00d4ff]/80 hover:text-[#00d4ff] flex items-center gap-1.5"
            >
              <Search className="w-3 h-3" />
              Change location
            </button>
          </div>

          <div className="border border-white/[0.08] bg-white/[0.02] px-4 py-4 rounded-sm space-y-1">
            <span className="text-white/35 text-[10px] tracking-wider uppercase">Estimated total</span>
            <p className="text-white text-2xl font-light">₹{Math.round(totalAmount || 0)}</p>
            <p className="text-white/30 text-xs">
              {durationHours.toFixed(1)}h × ₹{effectivePrice}/hr
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/[0.12] text-white/75 text-xs tracking-wider uppercase rounded-sm hover:bg-white/[0.05] transition-all"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </a>
            <button
              type="button"
              onClick={() => onBook?.(spot, startMs, endMs, effectivePrice)}
              disabled={
                spot.markerColor === 'red' || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs
              }
              className="w-full py-3.5 border border-white/25 bg-white/[0.06] text-white text-xs tracking-[0.12em] uppercase rounded-sm hover:bg-white hover:text-black transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {spot.markerColor === 'red' ? 'Fully booked for this window' : 'Book now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
