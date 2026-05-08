'use client';

import { useState } from 'react';
import type { Booking } from '@/types';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface RateBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onRated?: () => void;
}

export default function RateBookingModal({ booking, onClose, onRated }: RateBookingModalProps) {
  const [rating, setRating] = useState<number>(booking.rating || 0);
  const [reviewText, setReviewText] = useState(booking.reviewText || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error('Please choose a rating between 1 and 5.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rate',
          bookingId: booking.bookingId,
          rating,
          reviewText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit rating');
      toast.success('Thanks for your feedback!');
      onRated?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1400] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.1] p-5">
        <h3 className="text-white text-sm tracking-wider uppercase mb-1">Rate Parking Experience</h3>
        <p className="text-white/35 text-xs mb-4">{booking.spotTitle}</p>

        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`p-1 ${star <= rating ? 'text-amber-400' : 'text-white/20'} hover:text-amber-300`}
            >
              <Star className="w-5 h-5" fill={star <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Optional review..."
          rows={3}
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30"
        />

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-white/[0.1] text-white/60 text-xs uppercase tracking-wider"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
