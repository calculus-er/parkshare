'use client';

import { ParkingSpot } from '@/types';
import { formatDistance, getETAMinutes } from '@/lib/mapbox';
import { MapPin, Shield, Zap, Eye, Star, Clock, Navigation, Map } from 'lucide-react';

interface SpotListCardProps {
  spot: ParkingSpot & {
    distanceKm: number;
    markerColor: string;
    aiPricePerHour?: number;
    aiPricingReason?: string;
  };
  onViewOnMap: () => void;
  /** Opens the same listing detail modal as map marker selection */
  onOpenListing: () => void;
}

export default function SpotListCard({ spot, onViewOnMap, onOpenListing }: SpotListCardProps) {
  const etaMinutes = getETAMinutes(spot.distanceKm);

  const statusConfig: Record<string, { label: string; style: string }> = {
    green:  { label: 'Available',    style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    yellow: { label: 'Ending Soon',  style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    red:    { label: 'Booked',       style: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const status = statusConfig[spot.markerColor] || statusConfig.green;

  return (
    <div
      onClick={onOpenListing}
      className="w-full text-left bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group cursor-pointer"
    >
      {/* Image header */}
      {spot.images.length > 0 ? (
        <div className="relative aspect-video overflow-hidden bg-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={spot.images[0]} alt={spot.title} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

          {/* Status badge */}
          <div className={`absolute top-3 left-3 px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${status.style}`}>
            {status.label}
          </div>

          {/* Price badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm">
            <span className="text-white text-sm font-light">₹{spot.aiPricePerHour ?? '—'}</span>
            <span className="text-white/40 text-[10px]">/hr</span>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-white/[0.02] flex items-center justify-center relative">
          <MapPin className="w-8 h-8 text-white/10" />
          <div className={`absolute top-3 left-3 px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${status.style}`}>
            {status.label}
          </div>
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#0a0a0a]/80 border border-white/10 rounded-sm">
            <span className="text-white text-sm font-light">₹{spot.aiPricePerHour ?? '—'}</span>
            <span className="text-white/40 text-[10px]">/hr</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white text-sm font-medium mb-1 line-clamp-1">{spot.title}</h3>
        <p className="text-white/30 text-xs flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{spot.address}</span>
        </p>

        {/* Feature chips */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {spot.vehicleTypes.map((vt) => (
            <span key={vt} className="px-1.5 py-0.5 text-[8px] bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">
              {vt}
            </span>
          ))}
          {spot.isCovered && (
            <span className="px-1.5 py-0.5 text-[8px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-0.5">
              <Shield className="w-2 h-2" /> Covered
            </span>
          )}
          {spot.hasEVCharging && (
            <span className="px-1.5 py-0.5 text-[8px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-0.5">
              <Zap className="w-2 h-2" /> EV
            </span>
          )}
          {spot.hasCCTV && (
            <span className="px-1.5 py-0.5 text-[8px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-0.5">
              <Eye className="w-2 h-2" /> CCTV
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-4 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="text-[#00d4ff] flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {formatDistance(spot.distanceKm)}
            </span>
            <span className="text-white/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{etaMinutes} min
            </span>
          </div>
          {spot.averageRating > 0 && (
            <span className="text-amber-400 flex items-center gap-1">
              <Star className="w-3 h-3" />
              {spot.averageRating.toFixed(1)}
            </span>
          )}
        </div>

        {spot.aiPricingReason && (
          <p className="text-white/25 text-[10px] italic mb-3 line-clamp-2">{spot.aiPricingReason}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewOnMap();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-white/[0.08] text-white/50 text-[10px] tracking-wider uppercase
                       hover:bg-white/[0.04] hover:text-white/70 transition-all"
          >
            <Map className="w-3 h-3" />
            Map
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenListing();
            }}
            disabled={spot.markerColor === 'red'}
            className="flex-1 py-2 border border-white/20 bg-white/[0.03] text-white text-[10px] tracking-[0.12em] uppercase
                       hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {spot.markerColor === 'red' ? 'Booked' : 'View details'}
          </button>
        </div>
      </div>
    </div>
  );
}
