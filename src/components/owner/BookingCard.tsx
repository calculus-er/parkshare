'use client';

import { Booking } from '@/types';
import { format } from 'date-fns';
import { Clock, User, Ban, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { arrayUnion } from 'firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface BookingCardProps {
  booking: Booking;
  showBlockButton?: boolean;
}

export default function BookingCard({ booking, showBlockButton = true }: BookingCardProps) {
  const [blocking, setBlocking] = useState(false);

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-white/5 text-white/40 border-white/10',
    cancelled: 'bg-white/5 text-white/30 border-white/10',
    overstaying: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const getTimeRemaining = (): string => {
    if (booking.status !== 'active') return '';
    const now = Date.now();
    const end = booking.endTime.toMillis();
    const diff = end - now;
    if (diff <= 0) return 'Overstaying';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m remaining`;
  };

  const handleBlockDriver = async () => {
    if (!confirm('Block this driver from booking your spots in the future?')) return;
    setBlocking(true);
    try {
      await updateDoc(doc(db, 'users', booking.driverId), {
        blockedBy: arrayUnion(booking.ownerId),
      });
      toast.success('Driver blocked successfully');
    } catch {
      toast.error('Failed to block driver');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] p-5 hover:bg-white/[0.05] transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/60">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{booking.driverName}</p>
            <p className="text-white/30 text-xs">{booking.spotTitle}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border rounded-sm ${
            statusColors[booking.status] || statusColors.completed
          }`}
        >
          {booking.status}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Duration</p>
          <p className="text-white/70 text-sm">{booking.durationHours}h</p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Amount</p>
          <p className="text-white/70 text-sm">₹{booking.totalAmount}</p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Start</p>
          <p className="text-white/70 text-sm">
            {booking.startTime?.toDate
              ? format(booking.startTime.toDate(), 'dd MMM, HH:mm')
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">End</p>
          <p className="text-white/70 text-sm">
            {booking.endTime?.toDate
              ? format(booking.endTime.toDate(), 'dd MMM, HH:mm')
              : '—'}
          </p>
        </div>
      </div>

      {/* Time remaining for active bookings */}
      {booking.status === 'active' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-sm">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-xs">{getTimeRemaining()}</span>
        </div>
      )}

      {/* Overstay warning */}
      {booking.status === 'overstaying' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 text-xs font-medium">Vehicle is overstaying!</span>
        </div>
      )}

      {/* Damage claim badge */}
      {booking.damageClaimStatus !== 'none' && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 text-xs">
            Damage Claim: {booking.damageClaimStatus}
          </span>
        </div>
      )}

      {/* Actions */}
      {showBlockButton && booking.status !== 'cancelled' && (
        <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
          <button
            onClick={handleBlockDriver}
            disabled={blocking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400/70 border border-red-500/10
                       hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-40"
          >
            <Ban className="w-3 h-3" />
            {blocking ? 'Blocking...' : 'Block Driver'}
          </button>
        </div>
      )}
    </div>
  );
}
