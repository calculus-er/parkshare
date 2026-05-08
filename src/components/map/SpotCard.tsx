'use client';

import { useState, useEffect } from 'react';
import { ParkingSpot } from '@/types';
import { formatDistance, getETAMinutes } from '@/lib/mapbox';
import {
  X, MapPin, Shield, Zap, Eye, Clock,
  ChevronLeft, ChevronRight, Navigation, Sparkles
} from 'lucide-react';

interface SpotCardProps {
  spot: ParkingSpot & { distanceKm: number; markerColor: string };
  userLat: number;
  userLng: number;
  onClose: () => void;
  onBook?: (spot: ParkingSpot, hours: number, aiPrice: number) => void;
}

export default function SpotCard({ spot, onClose, onBook }: SpotCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedHours, setSelectedHours] = useState(1);
  const [aiPrice, setAiPrice] = useState<{
    finalPrice: number;
    surgeMultiplier: number;
    reasoning: string;
    demandLevel: string;
  } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  const etaMinutes = getETAMinutes(spot.distanceKm);

  // Fetch AI pricing
  useEffect(() => {
    const fetchPrice = async () => {
      setLoadingPrice(true);
      try {
        const now = new Date();
        const res = await fetch('/api/ai/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spotId: spot.spotId,
            baseRate: spot.baseHourlyRate,
            lat: spot.latitude,
            lng: spot.longitude,
            timeOfDay: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
            dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
            occupancyNearby: 0.6 + Math.random() * 0.3, // Simulated
            hasUpcomingBooking: spot.markerColor === 'yellow',
          }),
        });
        const data = await res.json();
        if (data.finalPrice) {
          setAiPrice(data);
        } else {
          // Fallback if API isn't connected yet
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
  }, [spot]);

  const demandColors: Record<string, string> = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    very_high: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const totalAmount = aiPrice ? aiPrice.finalPrice * selectedHours : spot.baseHourlyRate * selectedHours;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/[0.08]
                    max-h-[70vh] overflow-y-auto animate-slide-up">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center
                   hover:bg-white/10 transition-all"
      >
        <X className="w-4 h-4 text-white/60" />
      </button>

      {/* Image Carousel */}
      {spot.images.length > 0 && (
        <div className="relative h-48 overflow-hidden">
          <div
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${currentImage * 100}%)` }}
          >
            {spot.images.map((img, i) => (
              <div key={i} className="min-w-full h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={spot.title} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {spot.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage((p) => Math.max(0, p - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setCurrentImage((p) => Math.min(spot.images.length - 1, p + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {spot.images.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Title & Distance */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white text-lg font-light tracking-wide">{spot.title}</h3>
            <p className="text-white/30 text-xs flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {spot.address}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#00d4ff] text-sm font-medium">{formatDistance(spot.distanceKm)}</p>
            <p className="text-white/30 text-[10px]">~{etaMinutes} min</p>
          </div>
        </div>

        {/* Feature chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {spot.vehicleTypes.map((vt) => (
            <span key={vt} className="px-2 py-1 text-[9px] bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">
              {vt}
            </span>
          ))}
          {spot.isCovered && (
            <span className="px-2 py-1 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Covered
            </span>
          )}
          {spot.hasEVCharging && (
            <span className="px-2 py-1 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> EV
            </span>
          )}
          {spot.hasCCTV && (
            <span className="px-2 py-1 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" /> CCTV
            </span>
          )}
        </div>

        {/* AI Price */}
        <div className="bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span className="text-white/40 text-[10px] tracking-wider uppercase">AI Price</span>
            </div>
            {aiPrice && (
              <span className={`px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${
                demandColors[aiPrice.demandLevel] || demandColors.medium
              }`}>
                {aiPrice.demandLevel.replace('_', ' ')} demand
              </span>
            )}
          </div>
          {loadingPrice ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
              <span className="text-white/30 text-xs">Calculating...</span>
            </div>
          ) : aiPrice ? (
            <>
              <p className="text-white text-2xl font-light">
                ₹{aiPrice.finalPrice}<span className="text-white/30 text-sm">/hr</span>
                {aiPrice.surgeMultiplier > 1 && (
                  <span className="text-amber-400 text-xs ml-2">
                    {aiPrice.surgeMultiplier.toFixed(1)}× surge
                  </span>
                )}
              </p>
              <p className="text-white/25 text-[11px] italic mt-1">{aiPrice.reasoning}</p>
            </>
          ) : null}
        </div>

        {/* Duration Picker */}
        <div className="mb-4">
          <p className="text-white/40 text-[10px] tracking-wider uppercase mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Duration
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHours(h)}
                className={`flex-1 py-2.5 text-xs tracking-wider border transition-all ${
                  selectedHours === h
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                    : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        {/* Total & Actions */}
        <div className="flex items-center justify-between mb-4 py-3 border-t border-b border-white/[0.06]">
          <div>
            <span className="text-white/30 text-[10px] tracking-wider uppercase">Total</span>
            <p className="text-white text-xl font-light">₹{Math.round(totalAmount)}</p>
          </div>
          <div className="text-right">
            <span className="text-white/30 text-[10px]">{selectedHours}h × ₹{aiPrice?.finalPrice || spot.baseHourlyRate}/hr</span>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 border border-white/[0.08] text-white/60 text-xs tracking-wider uppercase
                       hover:bg-white/[0.04] transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            Navigate
          </a>
          <button
            onClick={() => onBook?.(spot, selectedHours, aiPrice?.finalPrice || spot.baseHourlyRate)}
            disabled={spot.markerColor === 'red'}
            className="flex-1 py-3 border border-white/20 bg-white/[0.03] text-white text-xs tracking-[0.15em] uppercase
                       hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {spot.markerColor === 'red' ? 'Currently Booked' : 'Book Now'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
