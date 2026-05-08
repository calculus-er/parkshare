'use client';

import { Loader2, MapPin, Sparkles } from 'lucide-react';
import type { ParkingSpot } from '@/types';

interface BookingConfirmationProps {
  spot: ParkingSpot & { distanceKm?: number };
  durationHours: number;
  aiPricePerHour: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BookingConfirmation({
  spot,
  durationHours,
  aiPricePerHour,
  submitting,
  onCancel,
  onConfirm,
}: BookingConfirmationProps) {
  const totalAmount = Math.round(aiPricePerHour * durationHours);

  return (
    <div className="fixed inset-0 z-[1350] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.1] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white text-base tracking-wide">Confirm Booking</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-white font-medium">{spot.title}</p>
            <p className="text-white/35 text-xs mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {spot.address}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/[0.03] border border-white/[0.08] p-3">
              <p className="text-white/35 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-white">{durationHours.toFixed(1)} hour{durationHours > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] p-3">
              <p className="text-white/35 uppercase tracking-wider mb-1">AI Price</p>
              <p className="text-white">₹{aiPricePerHour}/hr</p>
            </div>
          </div>

          <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 p-3">
            <p className="text-[#00d4ff]/70 text-[10px] tracking-wider uppercase">Total Amount</p>
            <p className="text-[#00d4ff] text-xl font-light">₹{totalAmount}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 border border-white/[0.1] text-white/60 text-xs tracking-wider uppercase hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs tracking-wider uppercase hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm & Pay (Mock)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
