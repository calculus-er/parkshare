'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { subscribeToOwnerBookings } from '@/lib/firestore';
import { Booking } from '@/types';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import BookingCard from '@/components/owner/BookingCard';
import DamageReview from '@/components/owner/DamageReview';
import Link from 'next/link';
import { Plus, MapPin, CalendarClock, History, Zap } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

type Tab = 'active' | 'prebooked' | 'history';

export default function OwnerDashboard() {
  const { user } = useAppStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToOwnerBookings(user.uid, (data) => {
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const activeBookings = bookings.filter(
    (b) => b.status === 'active' || b.status === 'overstaying'
  );
  const preBookedBookings = bookings
    .filter((b) => b.status === 'upcoming')
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
  const historyBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  const damageBookings = bookings.filter(
    (b) => b.damageClaimStatus === 'pending'
  );

  const tabs: { key: Tab; label: string; icon: typeof Zap; count: number }[] = [
    { key: 'active', label: 'Active', icon: Zap, count: activeBookings.length },
    { key: 'prebooked', label: 'Pre-Booked', icon: CalendarClock, count: preBookedBookings.length },
    { key: 'history', label: 'History', icon: History, count: historyBookings.length },
  ];

  const currentBookings = {
    active: activeBookings,
    prebooked: preBookedBookings,
    history: historyBookings,
  }[activeTab];

  return (
    <AuthGuard requiredRole="owner">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-light text-white tracking-wide">
                Owner Dashboard
              </h1>
              <p className="text-white/40 text-sm mt-1">
                Manage your bookings and spots
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/owner/spots"
                className="flex items-center gap-2 px-4 py-2.5 border border-white/[0.08] text-white/60 text-xs tracking-wider uppercase
                           hover:bg-white/[0.04] hover:text-white transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                My Spots
              </Link>
              <Link
                href="/owner/list-spot"
                className="flex items-center gap-2 px-4 py-2.5 border border-white/20 text-white text-xs tracking-wider uppercase
                           hover:bg-white hover:text-black transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                List Spot
              </Link>
            </div>
          </div>

          {/* Damage Claims Alert */}
          {damageBookings.length > 0 && (
            <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/15">
              <p className="text-amber-400 text-sm mb-3 font-medium">
                ⚠️ {damageBookings.length} pending damage claim{damageBookings.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {damageBookings.map((b) => (
                  <DamageReview key={b.bookingId} booking={b} />
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/[0.06] overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-xs tracking-wider uppercase border-b-2 transition-all whitespace-nowrap ${
                  activeTab === key
                    ? 'border-[#00d4ff] text-[#00d4ff]'
                    : 'border-transparent text-white/30 hover:text-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[9px] rounded-sm ${
                    activeTab === key
                      ? 'bg-[#00d4ff]/10 text-[#00d4ff]'
                      : 'bg-white/5 text-white/30'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Booking List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.08] p-5 space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : currentBookings.length === 0 ? (
            <EmptyState
              title={`No ${activeTab === 'prebooked' ? 'pre-booked' : activeTab} bookings`}
              description={
                activeTab === 'active'
                  ? 'No vehicles are currently parked at your spots.'
                  : activeTab === 'prebooked'
                    ? 'No upcoming reservations for your spots.'
                    : 'Completed bookings will appear here.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentBookings.map((booking) => (
                <BookingCard
                  key={booking.bookingId}
                  booking={booking}
                  showBlockButton={activeTab !== 'history'}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
