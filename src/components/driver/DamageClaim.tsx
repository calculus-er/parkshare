'use client';

import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AIDamageResponse, Booking } from '@/types';
import { AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DamageClaimProps {
  booking: Booking;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function DamageClaim({ booking, onClose, onSubmitted }: DamageClaimProps) {
  const [driverNote, setDriverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<AIDamageResponse | null>(null);

  const handleSubmit = async () => {
    if (!driverNote.trim()) {
      toast.error('Please describe the damage you found.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/ai/damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          entryVideoURL: booking.entryVideoURL,
          exitVideoURL: booking.exitVideoURL,
          driverNote,
        }),
      });
      const data = (await res.json()) as AIDamageResponse;
      if (!res.ok) throw new Error('Failed to generate damage report');

      setReport(data);
      await updateDoc(doc(db, 'bookings', booking.bookingId as string), {
        damageClaimStatus: 'pending',
        damageReport: {
          ...data,
          driverNote,
          submittedAt: serverTimestamp(),
        },
      });
      toast.success('Damage claim submitted.');
      onSubmitted?.();
    } catch {
      toast.error('Unable to submit damage claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/[0.1] p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-white text-sm tracking-wider uppercase">Raise Damage Claim</h3>
        </div>
        <p className="text-white/35 text-xs mb-3">{booking.spotTitle}</p>

        <textarea
          value={driverNote}
          onChange={(e) => setDriverNote(e.target.value)}
          rows={4}
          placeholder="Describe the damage you found..."
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30"
        />

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/[0.1] text-white/60 text-xs uppercase tracking-wider"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Submit Claim
          </button>
        </div>

        {report && (
          <div className="mt-4 bg-white/[0.03] border border-white/[0.08] p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">AI Report</p>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <p className="text-white/70">Damage: <span className="text-white">{report.damageDetected ? 'Detected' : 'Not detected'}</span></p>
              <p className="text-white/70">Confidence: <span className="text-white">{report.confidenceScore}%</span></p>
              <p className="text-white/70">Severity: <span className="text-white">{report.severity}</span></p>
              <p className="text-white/70">Est. Cost: <span className="text-white">₹{report.estimatedRepairCost}</span></p>
            </div>
            <p className="text-white/60 text-xs">{report.aiRemarks}</p>
          </div>
        )}
      </div>
    </div>
  );
}
