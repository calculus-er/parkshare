'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { deleteParkingSpot, getParkingSpots, updateParkingSpot } from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { deleteObject, ref } from 'firebase/storage';
import { ParkingSpot } from '@/types';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import Link from 'next/link';
import {
  MapPin, Shield, Zap, Eye, ToggleLeft, ToggleRight,
  Trash2, Plus, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MySpotsPage() {
  const { user } = useAppStore();
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSpots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSpots = async () => {
    if (!user) return;
    try {
      const data = await getParkingSpots({ ownerId: user.uid, activeOnly: false });
      setSpots(data);
    } catch {
      toast.error('Failed to load spots');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (spot: ParkingSpot) => {
    if (!spot.spotId) return;
    try {
      await updateParkingSpot(spot.spotId, { isActive: !spot.isActive });
      setSpots((prev) =>
        prev.map((s) =>
          s.spotId === spot.spotId ? { ...s, isActive: !s.isActive } : s
        )
      );
      toast.success(spot.isActive ? 'Spot deactivated' : 'Spot activated');
    } catch {
      toast.error('Failed to update spot');
    }
  };

  const deleteSpot = async (spot: ParkingSpot) => {
    if (!spot.spotId) return;
    if (!confirm('Are you sure you want to permanently delete this spot? This cannot be undone.')) return;
    try {
      await Promise.all(
        (spot.images || []).map(async (url) => {
          try {
            await deleteObject(ref(storage, url));
          } catch {
            // Best-effort: continue even if image deletion fails.
          }
        })
      );
      await deleteParkingSpot(spot.spotId);
      setSpots((prev) => prev.filter((s) => s.spotId !== spot.spotId));
      toast.success('Spot deleted permanently');
    } catch {
      toast.error('Failed to delete spot');
    }
  };

  return (
    <AuthGuard requiredRole="owner">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-light text-white tracking-wide">
                My Spots
              </h1>
              <p className="text-white/40 text-sm mt-1">
                {spots.length} spot{spots.length !== 1 ? 's' : ''} listed
              </p>
            </div>
            <Link
              href="/owner/list-spot"
              className="flex items-center gap-2 px-4 py-2.5 border border-white/20 text-white text-xs tracking-wider uppercase
                         hover:bg-white hover:text-black transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              List New Spot
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
            </div>
          ) : spots.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.08] p-12 text-center">
              <MapPin className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <h2 className="text-white/40 text-lg font-light mb-2">No spots listed yet</h2>
              <p className="text-white/20 text-sm mb-6">Start earning by listing your first parking space</p>
              <Link
                href="/owner/list-spot"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white text-xs tracking-wider uppercase
                           hover:bg-white hover:text-black transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                List Your First Spot
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {spots.map((spot) => (
                <div
                  key={spot.spotId}
                  className={`bg-white/[0.03] border border-white/[0.08] p-5 hover:bg-white/[0.05] transition-all ${
                    !spot.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white text-sm font-medium">{spot.title}</h3>
                        <span
                          className={`px-2 py-0.5 text-[9px] tracking-wider uppercase border rounded-sm ${
                            spot.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-white/5 text-white/30 border-white/10'
                          }`}
                        >
                          {spot.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-white/30 text-xs mb-3 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {spot.address}
                      </p>

                      {/* Features */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {spot.vehicleTypes.map((vt) => (
                          <span key={vt} className="px-2 py-0.5 text-[9px] bg-white/5 border border-white/10 text-white/40 uppercase tracking-wider">
                            {vt}
                          </span>
                        ))}
                        {spot.isCovered && (
                          <span className="px-2 py-0.5 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> Covered
                          </span>
                        )}
                        {spot.hasEVCharging && (
                          <span className="px-2 py-0.5 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> EV
                          </span>
                        )}
                        {spot.hasCCTV && (
                          <span className="px-2 py-0.5 text-[9px] bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" /> CCTV
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 text-xs">
                        <span className="text-white/40">
                          ₹{spot.baseHourlyRate}/hr · ₹{spot.baseDailyRate}/day
                        </span>
                        <span className="text-white/30 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {spot.averageRating || '—'}
                        </span>
                        <span className="text-white/30">
                          {spot.totalBookings} bookings
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleActive(spot)}
                        className="p-2 text-white/30 hover:text-white/60 transition-colors"
                        title={spot.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {spot.isActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteSpot(spot)}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
