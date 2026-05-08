'use client';

import { useState } from 'react';
import { Clock, AlertTriangle, Loader2, Sparkles, MapPin, User } from 'lucide-react';
import type { Booking, AIConflictResponse } from '@/types';
import toast from 'react-hot-toast';
import { createNotification } from '@/lib/notifications';

interface ExtensionModalProps {
  booking: Booking;
  onClose: () => void;
  onExtended: () => void;
}

interface ConflictInfo {
  bookingId: string;
  driverName: string;
  driverId: string;
  startTimeMs: number;
  endTimeMs: number;
}

export default function ExtensionModal({ booking, onClose, onExtended }: ExtensionModalProps) {
  const [extensionHours, setExtensionHours] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [aiResolution, setAiResolution] = useState<AIConflictResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [resolving, setResolving] = useState(false);

  const pricePerHour = booking.baseRate * booking.aiSurgeMultiplier;
  const additionalAmount = Math.round(pricePerHour * extensionHours);

  const handleExtend = async () => {
    setSubmitting(true);
    setConflict(null);
    setAiResolution(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          action: 'extend',
          extensionHours,
          additionalAmount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Booking extended by ${extensionHours}h!`);
        onExtended();
        return;
      }

      if (res.status === 409 && data.conflict) {
        setConflict(data.conflictingBooking);
        // Fetch AI conflict resolution
        setLoadingAI(true);
        try {
          const aiRes = await fetch('/api/ai/conflict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentDriverName: booking.driverName,
              nextDriverName: data.conflictingBooking.driverName,
              spotTitle: booking.spotTitle,
              spotAddress: booking.spotAddress,
              extensionHours,
              currentBookingRate: booking.baseRate,
              nextBookingRate: booking.baseRate,
              currentDriverScore: 80,
              nextDriverScore: 80,
            }),
          });
          const aiData = await aiRes.json();
          if (aiData.compensationAmount !== undefined) {
            setAiResolution(aiData);
          }
        } catch {
          // AI failed — conflict info is still visible
        } finally {
          setLoadingAI(false);
        }
        return;
      }

      toast.error(data.error || 'Extension failed.');
    } catch {
      toast.error('Unable to process extension.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulatedResolution = async () => {
    if (!conflict || !aiResolution) return;
    setResolving(true);
    await new Promise((r) => setTimeout(r, 4000));

    const accepted = Math.random() < 0.7;
    if (accepted) {
      toast.success('Conflict resolved: extension accepted by next driver.');
      await createNotification(
        booking.driverId,
        'conflict_resolved',
        `Extension approved at ${booking.spotTitle}. Compensation processed.`,
        { bookingId: booking.bookingId as string, spotTitle: booking.spotTitle }
      );
      await createNotification(
        conflict.driverId,
        'conflict_resolved',
        `Conflict resolved at ${booking.spotTitle}. You received compensation offer of ₹${aiResolution.compensationAmount}.`,
        { bookingId: conflict.bookingId, spotTitle: booking.spotTitle }
      );
    } else {
      toast.error('Conflict resolved: extension rejected by next driver.');
      await createNotification(
        booking.driverId,
        'conflict_resolved',
        `Extension denied at ${booking.spotTitle}. Please vacate on time.`,
        { bookingId: booking.bookingId as string, spotTitle: booking.spotTitle }
      );
      await createNotification(
        conflict.driverId,
        'conflict_resolved',
        `Conflict resolved at ${booking.spotTitle}. Your original booking stays unchanged.`,
        { bookingId: conflict.bookingId, spotTitle: booking.spotTitle }
      );
    }
    setResolving(false);
    onClose();
  };

  const urgencyColors: Record<string, string> = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.1] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#00d4ff]" />
            <h3 className="text-white text-base tracking-wide">Extend Booking</h3>
          </div>
          <p className="text-white/30 text-xs mt-1">{booking.spotTitle}</p>
        </div>

        <div className="p-5">
          {!conflict ? (
            /* ── Normal extension flow ── */
            <>
              {/* Duration picker */}
              <div className="mb-5">
                <p className="text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Extend by
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtensionHours(h)}
                      className={`flex-1 py-2.5 text-xs tracking-wider border transition-all ${
                        extensionHours === h
                          ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                          : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60'
                      }`}
                    >
                      +{h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost */}
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px] tracking-wider uppercase">Additional Cost</span>
                  <span className="text-white/30 text-[10px]">{extensionHours}h × ₹{Math.round(pricePerHour)}/hr</span>
                </div>
                <p className="text-white text-xl font-light mt-1">₹{additionalAmount}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-2.5 border border-white/[0.1] text-white/60 text-xs tracking-wider uppercase hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={submitting}
                  className="flex-1 py-2.5 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs tracking-wider uppercase
                             hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Extend & Pay (Mock)'
                  )}
                </button>
              </div>
            </>
          ) : (
            /* ── Conflict resolution view ── */
            <>
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-xs tracking-wider uppercase">Booking Conflict</span>
                </div>
                <p className="text-white/60 text-sm">
                  Extending by {extensionHours}h would conflict with a reservation by{' '}
                  <span className="text-white">{conflict.driverName}</span>
                </p>
                <div className="mt-2 text-white/30 text-[10px] flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {conflict.driverName}
                  </span>
                  <span>
                    {new Date(conflict.startTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' → '}
                    {new Date(conflict.endTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* AI Resolution */}
              {loadingAI ? (
                <div className="bg-white/[0.03] border border-white/[0.06] p-4 mb-5 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-[#00d4ff] animate-pulse" />
                  <span className="text-white/40 text-xs">AI is analyzing the conflict...</span>
                </div>
              ) : aiResolution ? (
                <div className="bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#00d4ff]" />
                      <span className="text-white/40 text-[10px] tracking-wider uppercase">AI Resolution</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${
                      urgencyColors[aiResolution.urgencyLevel] || urgencyColors.medium
                    }`}>
                      {aiResolution.urgencyLevel} urgency
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Compensation to next driver</p>
                      <p className="text-white text-lg font-light">₹{aiResolution.compensationAmount}</p>
                      <p className="text-white/25 text-[11px] italic mt-0.5">{aiResolution.compensationReason}</p>
                    </div>

                    <div>
                      <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Strategy</p>
                      <p className="text-white/60 text-xs leading-relaxed">{aiResolution.resolutionStrategy}</p>
                    </div>

                    <div>
                      <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Alternate Spot</p>
                      <p className="text-white/50 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {aiResolution.alternateSpotRecommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConflict(null);
                    setAiResolution(null);
                  }}
                  className="flex-1 py-2.5 border border-white/[0.1] text-white/60 text-xs tracking-wider uppercase hover:text-white transition-colors"
                >
                  Change Duration
                </button>
                <button
                  type="button"
                  onClick={handleSimulatedResolution}
                  disabled={!aiResolution || resolving}
                  className="flex-1 py-2.5 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs tracking-wider uppercase hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Waiting...
                    </>
                  ) : (
                    'Simulate Resolution'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-red-500/30 bg-red-500/10 text-red-400 text-xs tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                >
                  Cancel Extension
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
