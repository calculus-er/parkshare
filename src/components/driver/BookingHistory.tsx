'use client';

import type { Booking } from '@/types';

interface BookingHistoryProps {
  bookings: Booking[];
  loading?: boolean;
  onRaiseClaim?: (booking: Booking) => void;
}

export default function BookingHistory({ bookings, loading = false, onRaiseClaim }: BookingHistoryProps) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-sm tracking-wider uppercase">Booking History</h2>
        <span className="text-white/30 text-[10px]">{bookings.length} entries</span>
      </div>

      {loading ? (
        <div className="bg-white/[0.03] border border-white/[0.08] p-6 text-center text-white/40 text-sm">
          Loading history...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.08] p-6 text-center text-white/35 text-sm">
          No past bookings yet.
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const startedAt = new Date(booking.startTime.toMillis());
            const statusClass =
              booking.status === 'completed'
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                : booking.status === 'cancelled'
                  ? 'text-white/50 border-white/15 bg-white/[0.03]'
                  : booking.status === 'overstaying'
                    ? 'text-red-400 border-red-500/20 bg-red-500/10'
                    : 'text-blue-400 border-blue-500/20 bg-blue-500/10';

            return (
              <div
                key={booking.bookingId}
                className="bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-white text-sm">{booking.spotTitle}</p>
                  <p className="text-white/30 text-xs mt-1">
                    {startedAt.toLocaleDateString()} • {startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {booking.durationHours}h
                  </p>
                  {onRaiseClaim && booking.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => onRaiseClaim(booking)}
                      className="mt-2 text-[10px] uppercase tracking-wider text-amber-400/80 hover:text-amber-400 transition-colors"
                    >
                      Raise damage claim
                    </button>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-white text-sm">₹{booking.totalAmount}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider border ${statusClass}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
