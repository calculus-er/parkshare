'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import { useAppStore } from '@/store/useAppStore';
import type { Booking } from '@/types';
import { getBookingsForDriver } from '@/lib/firestore';
import EmptyState from '@/components/ui/EmptyState';
import RateBookingModal from '@/components/driver/RateBookingModal';
import { AlertTriangle } from 'lucide-react';

export default function DriverBookingsPage() {
  const { user } = useAppStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rateBooking, setRateBooking] = useState<Booking | null>(null);

  const refreshBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await getBookingsForDriver(user.uid);
      setBookings(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeBookings = useMemo(
    () => bookings.filter((b) => ['active', 'upcoming', 'overstaying'].includes(b.status)),
    [bookings]
  );
  const pastBookings = useMemo(
    () => bookings.filter((b) => ['completed', 'cancelled'].includes(b.status)),
    [bookings]
  );
  const complaints = useMemo(
    () => bookings.filter((b) => b.damageClaimStatus && b.damageClaimStatus !== 'none'),
    [bookings]
  );

  return (
    <AuthGuard requiredRole="driver">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <section>
            <h1 className="text-2xl font-light text-white tracking-wide">My Bookings</h1>
            <p className="text-white/35 text-sm mt-1">Active and past bookings in one place.</p>
          </section>

          <section>
            <h2 className="text-white/70 text-xs uppercase tracking-wider mb-3">Active</h2>
            {loading ? (
              <div className="text-white/40 text-sm">Loading...</div>
            ) : activeBookings.length === 0 ? (
              <EmptyState title="No active bookings" description="Current and upcoming bookings will appear here." />
            ) : (
              <div className="space-y-2">
                {activeBookings.map((booking) => (
                  <div key={booking.bookingId} className="bg-white/[0.03] border border-white/[0.08] p-4">
                    <p className="text-white text-sm">{booking.spotTitle}</p>
                    <p className="text-white/35 text-xs mt-1">{booking.status.toUpperCase()} • ₹{booking.totalAmount}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-white/70 text-xs uppercase tracking-wider mb-3">Past Bookings</h2>
            {loading ? (
              <div className="text-white/40 text-sm">Loading...</div>
            ) : pastBookings.length === 0 ? (
              <EmptyState title="No past bookings" description="Completed and cancelled bookings will appear here." />
            ) : (
              <div className="space-y-2">
                {pastBookings.map((booking) => (
                  <div key={booking.bookingId} className="bg-white/[0.03] border border-white/[0.08] p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white text-sm">{booking.spotTitle}</p>
                      <p className="text-white/35 text-xs mt-1">{booking.status.toUpperCase()} • ₹{booking.totalAmount}</p>
                    </div>
                    {booking.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => setRateBooking(booking)}
                        className="text-[10px] uppercase tracking-wider px-2 py-1 border border-[#00d4ff]/25 text-[#00d4ff] hover:bg-[#00d4ff]/15"
                      >
                        {booking.rating ? 'Update review' : 'Rate now'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-white/70 text-xs uppercase tracking-wider mb-3">Complaints</h2>
            {loading ? (
              <div className="text-white/40 text-sm">Loading...</div>
            ) : complaints.length === 0 ? (
              <EmptyState title="No complaints" description="Raised complaints and statuses appear here." />
            ) : (
              <div className="space-y-2">
                {complaints.map((booking) => (
                  <div key={booking.bookingId} className="bg-white/[0.03] border border-white/[0.08] p-4">
                    <p className="text-white text-sm flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      {booking.spotTitle}
                    </p>
                    <p className="text-white/35 text-xs mt-1">
                      Status: {booking.damageClaimStatus?.toUpperCase()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {rateBooking && (
        <RateBookingModal
          booking={rateBooking}
          onClose={() => setRateBooking(null)}
          onRated={refreshBookings}
        />
      )}
    </AuthGuard>
  );
}
