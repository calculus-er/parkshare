'use client';

import { Booking } from '@/types';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { updateBooking } from '@/lib/firestore';
import toast from 'react-hot-toast';

interface DamageReviewProps {
  booking: Booking;
  onUpdated?: () => void;
}

export default function DamageReview({ booking, onUpdated }: DamageReviewProps) {
  const report = booking.damageReport;
  if (!report) return null;

  const severityColors: Record<string, string> = {
    none: 'text-green-400 bg-green-500/10 border-green-500/20',
    minor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    moderate: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    severe: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  const handleResolve = async (accepted: boolean) => {
    if (!booking.bookingId) return;
    try {
      await updateBooking(booking.bookingId, {
        damageClaimStatus: 'resolved',
      });
      toast.success(
        accepted
          ? 'Damage claim accepted. Compensation will be processed.'
          : 'Damage claim rejected.'
      );
      onUpdated?.();
    } catch {
      toast.error('Failed to update damage claim');
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-white text-sm font-medium tracking-wide">
          AI Damage Report
        </h3>
        <span
          className={`ml-auto px-2.5 py-1 text-[10px] tracking-wider uppercase border rounded-sm ${
            severityColors[report.severity] || severityColors.none
          }`}
        >
          {report.severity}
        </span>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/30 text-[10px] tracking-wider uppercase">
            AI Confidence
          </span>
          <span className="text-white/60 text-xs">{report.confidenceScore}%</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00d4ff] rounded-full transition-all"
            style={{ width: `${report.confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Damage Areas */}
      {report.suspectedDamageAreas.length > 0 && (
        <div className="mb-4">
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-2">
            Suspected Areas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {report.suspectedDamageAreas.map((area, i) => (
              <span
                key={i}
                className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 text-white/50 rounded-sm"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cost & Recommendation */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">
            Est. Repair Cost
          </p>
          <p className="text-white text-sm font-medium">₹{report.estimatedRepairCost}</p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">
            AI Recommendation
          </p>
          <p className="text-white/60 text-sm capitalize">{report.recommendation}</p>
        </div>
      </div>

      {/* AI Remarks */}
      <div className="mb-4 p-3 bg-white/[0.02] border border-white/[0.05]">
        <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">
          AI Analysis
        </p>
        <p className="text-white/50 text-xs leading-relaxed">{report.aiRemarks}</p>
      </div>

      {/* Driver Note */}
      <div className="mb-5 p-3 bg-white/[0.02] border border-white/[0.05]">
        <p className="text-white/30 text-[10px] tracking-wider uppercase mb-1">
          Driver&apos;s Note
        </p>
        <p className="text-white/50 text-xs leading-relaxed italic">
          &ldquo;{report.driverNote}&rdquo;
        </p>
      </div>

      {/* Video Links */}
      <div className="flex gap-3 mb-5">
        {booking.entryVideoURL && (
          <a
            href={booking.entryVideoURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#00d4ff]/70 border border-[#00d4ff]/10 hover:bg-[#00d4ff]/5 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Entry Video
          </a>
        )}
        {booking.exitVideoURL && (
          <a
            href={booking.exitVideoURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#00d4ff]/70 border border-[#00d4ff]/10 hover:bg-[#00d4ff]/5 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Exit Video
          </a>
        )}
      </div>

      {/* Accept / Reject buttons */}
      {booking.damageClaimStatus === 'pending' && (
        <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => handleResolve(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs tracking-wider uppercase hover:bg-emerald-500/20 transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Accept & Compensate
          </button>
          <button
            onClick={() => handleResolve(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs tracking-wider uppercase hover:bg-red-500/20 transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject Claim
          </button>
        </div>
      )}
    </div>
  );
}
