'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileUrl, getTileAttribution } from '@/lib/mapbox';
import { getDistanceKm } from '@/lib/mapbox';
import { subscribeToParkingSpots, getBookingsForSpot } from '@/lib/firestore';
import { ParkingSpot, Booking } from '@/types';
import SpotCard from './SpotCard';

// Custom colored marker icons
function createMarkerIcon(color: 'blue' | 'red' | 'yellow', price?: number): L.DivIcon {
  const colors = {
    blue: { bg: '#3b82f6', border: '#60a5fa', shadow: 'rgba(59,130,246,0.4)' },
    red: { bg: '#ef4444', border: '#f87171', shadow: 'rgba(239,68,68,0.4)' },
    yellow: { bg: '#f59e0b', border: '#fbbf24', shadow: 'rgba(245,158,11,0.4)' },
  };
  const c = colors[color];
  const priceLabel = price ? `₹${price}` : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="background:${c.bg};border:2px solid ${c.border};width:14px;height:14px;border-radius:50%;
                    box-shadow:0 0 12px ${c.shadow}, 0 2px 6px rgba(0,0,0,0.3);"></div>
        ${priceLabel ? `<div style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.15);padding:2px 6px;
                    border-radius:2px;margin-top:4px;font-size:10px;color:#fff;white-space:nowrap;
                    font-family:Inter,sans-serif;letter-spacing:0.03em;">${priceLabel}/hr</div>` : ''}
      </div>
    `,
    iconSize: [60, 40],
    iconAnchor: [30, 10],
  });
}

// Component to fly map to a location
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

interface SpotWithStatus extends ParkingSpot {
  distanceKm: number;
  markerColor: 'blue' | 'red' | 'yellow';
}

interface ParkingMapProps {
  onSpotSelect?: (spot: SpotWithStatus | null) => void;
  flyToLat?: number;
  flyToLng?: number;
  filters?: {
    maxPrice?: number;
    isCovered?: boolean;
    hasEVCharging?: boolean;
    hasCCTV?: boolean;
  };
}

export default function ParkingMap({ onSpotSelect, flyToLat, flyToLng, filters }: ParkingMapProps) {
  const [spots, setSpots] = useState<SpotWithStatus[]>([]);
  const [userLat, setUserLat] = useState(28.6139);
  const [userLng, setUserLng] = useState(77.209);
  const [selectedSpot, setSelectedSpot] = useState<SpotWithStatus | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocationReady(true);
        },
        () => {
          setLocationReady(true); // Use default (Delhi)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLocationReady(true);
    }
  }, []);

  // Subscribe to parking spots
  useEffect(() => {
    const unsubscribe = subscribeToParkingSpots(async (allSpots) => {
      // Determine marker color for each spot
      const spotsWithStatus: SpotWithStatus[] = await Promise.all(
        allSpots.map(async (spot) => {
          const distanceKm = getDistanceKm(userLat, userLng, spot.latitude, spot.longitude);
          let markerColor: 'blue' | 'red' | 'yellow' = 'blue';

          try {
            const bookings = await getBookingsForSpot(spot.spotId || '');
            const now = Date.now();
            const activeBooking = bookings.find(
              (b: Booking) => b.status === 'active' || b.status === 'overstaying'
            );

            if (activeBooking) {
              const endTime = activeBooking.endTime.toMillis();
              const timeLeft = endTime - now;
              if (timeLeft <= 30 * 60 * 1000 && timeLeft > 0) {
                markerColor = 'yellow'; // Ending within 30 min
              } else {
                markerColor = 'red'; // Fully booked
              }
            }
          } catch {
            // If we can't check bookings, default to available
          }

          return { ...spot, distanceKm, markerColor };
        })
      );

      // Apply client-side filters
      let filtered = spotsWithStatus;
      if (filters?.maxPrice) {
        filtered = filtered.filter((s) => s.baseHourlyRate <= filters.maxPrice!);
      }
      if (filters?.isCovered) {
        filtered = filtered.filter((s) => s.isCovered);
      }
      if (filters?.hasEVCharging) {
        filtered = filtered.filter((s) => s.hasEVCharging);
      }
      if (filters?.hasCCTV) {
        filtered = filtered.filter((s) => s.hasCCTV);
      }

      setSpots(filtered);
    });

    return () => unsubscribe();
  }, [userLat, userLng, filters]);

  const handleSpotClick = useCallback((spot: SpotWithStatus) => {
    setSelectedSpot(spot);
    onSpotSelect?.(spot);
  }, [onSpotSelect]);

  const handleCloseCard = useCallback(() => {
    setSelectedSpot(null);
    onSpotSelect?.(null);
  }, [onSpotSelect]);

  if (!locationReady) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
          <span className="text-white/40 text-xs tracking-wider uppercase">Locating you...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[userLat, userLng]}
        zoom={14}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
        zoomControl={false}
      >
        <TileLayer url={getTileUrl()} attribution={getTileAttribution()} />

        {/* Fly to searched location */}
        {flyToLat && flyToLng && <FlyTo lat={flyToLat} lng={flyToLng} zoom={15} />}

        {/* User location marker */}
        <Marker
          position={[userLat, userLng]}
          icon={L.divIcon({
            className: 'user-marker',
            html: `<div style="width:16px;height:16px;background:#00d4ff;border:3px solid #fff;border-radius:50%;
                              box-shadow:0 0 20px rgba(0,212,255,0.6);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>
            <span style={{ color: '#000', fontSize: '12px' }}>You are here</span>
          </Popup>
        </Marker>

        {/* Parking spot markers */}
        {spots.map((spot) => (
          <Marker
            key={spot.spotId}
            position={[spot.latitude, spot.longitude]}
            icon={createMarkerIcon(spot.markerColor, spot.baseHourlyRate)}
            eventHandlers={{
              click: () => handleSpotClick(spot),
            }}
          />
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-[#0a0a0a]/90 border border-white/[0.08] backdrop-blur-sm px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          {[
            { color: '#3b82f6', label: 'Available' },
            { color: '#f59e0b', label: 'Ending Soon' },
            { color: '#ef4444', label: 'Booked' },
            { color: '#00d4ff', label: 'You' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
              />
              <span className="text-white/50 text-[10px] tracking-wider uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spot Card (bottom sheet) */}
      {selectedSpot && (
        <SpotCard spot={selectedSpot} userLat={userLat} userLng={userLng} onClose={handleCloseCard} />
      )}
    </div>
  );
}
