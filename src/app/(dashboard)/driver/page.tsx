'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToParkingSpots,
  getActiveBookingForDriver,
  getBookingsForDriver,
  subscribeToBooking,
  getParkingSpot,
} from '@/lib/firestore';
import { ParkingSpot } from '@/types';
import { Timestamp } from 'firebase/firestore';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import SpotListCard from '@/components/driver/SpotListCard';
import BookingConfirmation from '@/components/driver/BookingConfirmation';
import ActiveBookingPanel from '@/components/driver/ActiveBookingPanel';
import BookingHistory from '@/components/driver/BookingHistory';
import ExtensionModal from '@/components/driver/ExtensionModal';
import dynamic from 'next/dynamic';
import { enrichSpotsWithStatus } from '@/lib/spotUtils';
import type { SpotWithStatus, Booking } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  MapPin, Crosshair, Search, Map, LayoutGrid,
  SlidersHorizontal, X, Shield, Zap, Eye, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically import ParkingMap
const ParkingMap = dynamic(() => import('@/components/map/ParkingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
        <span className="text-white/40 text-xs tracking-wider uppercase">Loading map...</span>
      </div>
    </div>
  ),
});

type ViewMode = 'list' | 'map';
type LocationMode = 'idle' | 'locating' | 'ready';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface BookingDraft {
  spot: SpotWithStatus;
  durationHours: number;
  aiPricePerHour: number;
}

export default function DriverDashboard() {
  const { user, activeBooking, setActiveBooking } = useAppStore();

  // Location state
  const [locationMode, setLocationMode] = useState<LocationMode>('idle');
  const [centerLat, setCenterLat] = useState(28.6139);
  const [centerLng, setCenterLng] = useState(77.209);
  const [centerLabel, setCenterLabel] = useState('You');
  const [locationName, setLocationName] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [spots, setSpots] = useState<SpotWithStatus[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [filterCovered, setFilterCovered] = useState(false);
  const [filterEV, setFilterEV] = useState(false);
  const [filterCCTV, setFilterCCTV] = useState(false);

  // Map fly-to for "View on Map" from list
  const [flyToLat, setFlyToLat] = useState<number | undefined>();
  const [flyToLng, setFlyToLng] = useState<number | undefined>();

  // Booking state
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeBookingSpot, setActiveBookingSpot] = useState<ParkingSpot | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  // ── Location detection ──
  const handleNearMe = useCallback(() => {
    setLocationMode('locating');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setCenterLat(pos.coords.latitude);
          setCenterLng(pos.coords.longitude);
          setCenterLabel('You');
          setLocationMode('ready');
          // Reverse geocode for a friendly name
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            const parts = data.display_name?.split(',') || [];
            setLocationName(parts.slice(0, 2).join(','));
          } catch {
            setLocationName('Your Location');
          }
        },
        () => {
          // Permission denied or error
          setLocationMode('ready');
          setLocationName('Delhi (default)');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationMode('ready');
      setLocationName('Delhi (default)');
    }
  }, []);

  // ── Destination search (Nominatim) ──
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=in`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleSelectDestination = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCenterLat(lat);
    setCenterLng(lng);
    setCenterLabel('Destination');
    setLocationName(result.display_name.split(',').slice(0, 2).join(','));
    setSearchQuery('');
    setShowResults(false);
    setLocationMode('ready');
  };

  // ── Subscribe to spots & enrich when location is ready ──
  useEffect(() => {
    if (locationMode !== 'ready') return;

    setLoadingSpots(true);
    const unsubscribe = subscribeToParkingSpots(async (allSpots: ParkingSpot[]) => {
      let enriched = await enrichSpotsWithStatus(allSpots, centerLat, centerLng);

      // Sort by distance
      enriched.sort((a, b) => a.distanceKm - b.distanceKm);

      // Apply filters
      if (maxPrice) {
        enriched = enriched.filter((s) => s.baseHourlyRate <= Number(maxPrice));
      }
      if (filterCovered) enriched = enriched.filter((s) => s.isCovered);
      if (filterEV) enriched = enriched.filter((s) => s.hasEVCharging);
      if (filterCCTV) enriched = enriched.filter((s) => s.hasCCTV);

      setSpots(enriched);
      setLoadingSpots(false);
    });

    return () => unsubscribe();
  }, [locationMode, centerLat, centerLng, maxPrice, filterCovered, filterEV, filterCCTV]);

  // ── "View on Map" from list ──
  const handleViewOnMap = (spot: SpotWithStatus) => {
    setFlyToLat(spot.latitude);
    setFlyToLng(spot.longitude);
    setViewMode('map');
  };

  const clearFilters = () => {
    setMaxPrice('');
    setFilterCovered(false);
    setFilterEV(false);
    setFilterCCTV(false);
    setShowFilters(false);
  };

  useEffect(() => {
    if (!user) return;

    let bookingUnsub: (() => void) | null = null;

    const bootstrapBooking = async () => {
      const active = await getActiveBookingForDriver(user.uid);
      if (!active) {
        setActiveBooking(null);
        return;
      }
      setActiveBooking(active);
      bookingUnsub = subscribeToBooking(active.bookingId as string, (updated) => {
        setActiveBooking(updated);
      });
    };

    bootstrapBooking();

    return () => {
      if (bookingUnsub) bookingUnsub();
    };
  }, [user, setActiveBooking]);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const allBookings = await getBookingsForDriver(user.uid);
        setBookingHistory(
          allBookings.filter((booking) => ['completed', 'cancelled'].includes(booking.status))
        );
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [user, activeBooking]);

  useEffect(() => {
    if (!activeBooking?.spotId) {
      setActiveBookingSpot(null);
      return;
    }

    const loadSpot = async () => {
      const spot = await getParkingSpot(activeBooking.spotId);
      setActiveBookingSpot(spot);
    };
    loadSpot();
  }, [activeBooking?.spotId]);

  const handleBookSpot = (spot: SpotWithStatus, hours: number, aiPrice: number) => {
    if (!user) {
      toast.error('Please sign in again.');
      return;
    }
    setBookingDraft({
      spot,
      durationHours: hours,
      aiPricePerHour: aiPrice,
    });
  };

  const handleConfirmBooking = async () => {
    if (!bookingDraft || !user) return;
    setBookingSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotId: bookingDraft.spot.spotId,
          driverId: user.uid,
          driverName: user.displayName || 'Driver',
          durationHours: bookingDraft.durationHours,
          aiPricePerHour: bookingDraft.aiPricePerHour,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      const createdBooking: Booking = {
        bookingId: data.bookingId,
        spotId: data.spotId,
        spotTitle: data.spotTitle,
        spotAddress: data.spotAddress,
        driverId: data.driverId,
        driverName: data.driverName,
        ownerId: data.ownerId,
        startTime: Timestamp.fromMillis(data.startTimeMs),
        endTime: Timestamp.fromMillis(data.endTimeMs),
        durationHours: data.durationHours,
        baseRate: data.baseRate,
        aiSurgeMultiplier: data.aiSurgeMultiplier,
        totalAmount: data.totalAmount,
        status: data.status,
        paymentStatus: data.paymentStatus,
        extensionRequests: [],
        entryVideoURL: null,
        exitVideoURL: null,
        damageClaimStatus: 'none',
        damageReport: null,
        createdAt: Timestamp.now(),
      };

      setActiveBooking(createdBooking);
      setBookingDraft(null);
      toast.success('Booking confirmed successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create booking');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleEndBooking = async () => {
    if (!activeBooking?.bookingId) return;
    try {
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: activeBooking.bookingId, action: 'end' }),
      });
      if (!response.ok) {
        throw new Error('Unable to end booking.');
      }
      setActiveBooking(null);
      toast.success('Booking ended. Exit video step will be added in Phase 9.');
    } catch {
      toast.error('Failed to end booking.');
    }
  };

  // ── Render: Location Selection (idle state) ──
  if (locationMode === 'idle' || locationMode === 'locating') {
    return (
      <AuthGuard requiredRole="driver">
        <Navbar />
        <main className="min-h-screen bg-[#0a0a0a] pt-16 flex items-center justify-center">
          <div className="max-w-lg w-full px-6">
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-light text-white tracking-wide mb-2">
                Find Parking
              </h1>
              <p className="text-white/35 text-sm">
                Search near your current location or enter a destination
              </p>
            </div>

            {/* Option 1: Near Me */}
            <button
              onClick={handleNearMe}
              disabled={locationMode === 'locating'}
              className="w-full mb-4 p-5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all
                         flex items-center gap-4 group disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                {locationMode === 'locating' ? (
                  <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
                ) : (
                  <Crosshair className="w-5 h-5 text-[#00d4ff] group-hover:scale-110 transition-transform" />
                )}
              </div>
              <div className="text-left">
                <h3 className="text-white text-sm font-medium">
                  {locationMode === 'locating' ? 'Detecting location...' : 'Find parking near me'}
                </h3>
                <p className="text-white/30 text-xs mt-0.5">
                  Uses your GPS to show nearby spots
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Option 2: Enter Destination */}
            <div className="relative">
              <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.08] focus-within:border-[#00d4ff]/30 transition-colors">
                <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter destination (e.g. Connaught Place)"
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 focus:outline-none"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/[0.08] max-h-60 overflow-y-auto z-50">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectDestination(result)}
                      className="w-full text-left px-4 py-3 text-sm text-white/60 hover:bg-white/[0.04] hover:text-white transition-all
                                 border-b border-white/[0.04] last:border-b-0 flex items-center gap-3"
                    >
                      <MapPin className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                      <span className="line-clamp-1">{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-white/15 text-[10px] tracking-wider uppercase mt-8">
              Powered by OpenStreetMap
            </p>
          </div>
        </main>
      </AuthGuard>
    );
  }

  // ── Render: Spots View (ready state) ──
  return (
    <AuthGuard requiredRole="driver">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        {/* Top Bar: Location + View Toggle + Filters */}
        <div className="sticky top-16 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Location info + change */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                  {centerLabel === 'You' ? (
                    <Crosshair className="w-3.5 h-3.5 text-[#00d4ff]" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-[#00d4ff]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{locationName || 'Your Location'}</p>
                  <p className="text-white/25 text-[10px]">{spots.length} spot{spots.length !== 1 ? 's' : ''} found</p>
                </div>
                <button
                  onClick={() => {
                    setLocationMode('idle');
                    setSearchQuery('');
                    setSpots([]);
                  }}
                  className="text-[#00d4ff]/60 text-[10px] tracking-wider uppercase hover:text-[#00d4ff] transition-colors flex-shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* Right: View toggle + filter */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Filter button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 border transition-all ${
                    showFilters
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                      : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                {/* View toggle */}
                <div className="flex border border-white/[0.08]">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-all ${
                      viewMode === 'list'
                        ? 'bg-white/10 text-white'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                    title="List View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2 transition-all ${
                      viewMode === 'map'
                        ? 'bg-white/10 text-white'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                    title="Map View"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel (collapsible) */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Max price */}
                  <div className="flex items-center gap-2">
                    <label className="text-white/30 text-[10px] tracking-wider uppercase">Max ₹/hr</label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Any"
                      className="w-20 px-2 py-1.5 bg-white/[0.03] border border-white/[0.08] text-white text-xs
                                 placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30"
                    />
                  </div>

                  {/* Feature toggles */}
                  {[
                    { key: 'covered', icon: Shield, label: 'Covered', value: filterCovered, setter: setFilterCovered },
                    { key: 'ev', icon: Zap, label: 'EV', value: filterEV, setter: setFilterEV },
                    { key: 'cctv', icon: Eye, label: 'CCTV', value: filterCCTV, setter: setFilterCCTV },
                  ].map(({ key, icon: Icon, label, value, setter }) => (
                    <button
                      key={key}
                      onClick={() => setter(!value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wider uppercase border transition-all ${
                        value
                          ? 'bg-[#00d4ff]/10 border-[#00d4ff]/20 text-[#00d4ff]'
                          : 'bg-white/[0.02] border-white/[0.08] text-white/30'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}

                  {/* Clear */}
                  <button
                    onClick={clearFilters}
                    className="text-white/20 text-[10px] tracking-wider uppercase hover:text-white/40 transition-colors ml-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {loadingSpots ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
              </div>
            ) : spots.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] p-12 text-center">
                <MapPin className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <h2 className="text-white/40 text-lg font-light mb-2">No spots found</h2>
                <p className="text-white/20 text-sm">
                  Try a different location or adjust your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {spots.map((spot) => (
                  <SpotListCard
                    key={spot.spotId}
                    spot={spot}
                    onViewOnMap={() => handleViewOnMap(spot)}
                    onBook={() => handleBookSpot(spot, 1, spot.baseHourlyRate)}
                  />
                ))}
              </div>
            )}
            <BookingHistory bookings={bookingHistory} loading={loadingHistory} />
          </div>
        ) : (
          /* ── MAP VIEW ── */
          <div className="h-[calc(100vh-7.5rem)]">
            <ParkingMap
              centerLat={centerLat}
              centerLng={centerLng}
              centerLabel={centerLabel}
              spots={spots}
              flyToLat={flyToLat}
              flyToLng={flyToLng}
              onBookSpot={handleBookSpot}
            />
          </div>
        )}
      </main>

      {bookingDraft && (
        <BookingConfirmation
          spot={bookingDraft.spot}
          durationHours={bookingDraft.durationHours}
          aiPricePerHour={bookingDraft.aiPricePerHour}
          submitting={bookingSubmitting}
          onCancel={() => setBookingDraft(null)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {activeBooking && (
        <ActiveBookingPanel
          booking={activeBooking}
          spot={activeBookingSpot}
          onExtend={() => setShowExtensionModal(true)}
          onEnd={handleEndBooking}
        />
      )}

      {showExtensionModal && activeBooking && (
        <ExtensionModal
          booking={activeBooking}
          onClose={() => setShowExtensionModal(false)}
          onExtended={() => {
            setShowExtensionModal(false);
            // Re-fetch active booking to get updated endTime
            if (user) {
              getActiveBookingForDriver(user.uid).then(setActiveBooking);
            }
          }}
        />
      )}
    </AuthGuard>
  );
}
