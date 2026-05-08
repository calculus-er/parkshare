'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, MapPinned, Navigation, TimerOff } from 'lucide-react';
import type { Booking, ParkingSpot } from '@/types';

interface ActiveBookingPanelProps {
  booking: Booking;
  spot: ParkingSpot | null;
  onExtend: () => void;
  onEnd: () => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveBookingPanel({ booking, spot, onExtend, onEnd }: ActiveBookingPanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeRemainingMs = booking.endTime.toMillis() - now;
  const countdown = formatCountdown(timeRemainingMs);

  const status = useMemo(() => {
    if (booking.status === 'overstaying' || timeRemainingMs <= 0) {
      return { label: 'Overstaying', className: 'text-red-400 border-red-500/25 bg-red-500/10' };
    }
    if (timeRemainingMs <= 15 * 60 * 1000) {
      return { label: 'Ending Soon', className: 'text-amber-400 border-amber-500/25 bg-amber-500/10' };
    }
    return { label: 'Active', className: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' };
  }, [booking.status, timeRemainingMs]);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[1150]">
      <div className="max-w-6xl mx-auto bg-[#0a0a0a]/95 backdrop-blur-md border border-white/[0.1] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{booking.spotTitle}</p>
            <p className="text-white/35 text-xs mt-1 truncate flex items-center gap-1">
              <MapPinned className="w-3 h-3" />
              {booking.spotAddress}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${status.className}`}>
                {status.label}
              </span>
              <span className="text-white/45 text-[11px] flex items-center gap-1">
                <Clock3 className="w-3 h-3" />
                {countdown}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExtend}
              className="px-3 py-2 border border-white/[0.1] text-white/70 text-[10px] uppercase tracking-wider hover:text-white transition-colors"
            >
              Extend Booking
            </button>
            <a
              href={
                spot
                  ? `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.spotAddress)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-white/[0.1] text-white/70 text-[10px] uppercase tracking-wider hover:text-white transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              Navigate
            </a>
            <button
              type="button"
              onClick={onEnd}
              className="px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] uppercase tracking-wider hover:bg-red-500/20 transition-colors flex items-center gap-1"
            >
              <TimerOff className="w-3 h-3" />
              End Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
