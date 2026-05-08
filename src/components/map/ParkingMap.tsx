'use client';

import { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileUrl, getTileAttribution } from '@/lib/mapbox';
import { SpotWithStatus } from '@/types';

// ── Marker icon factory ──
function createMarkerIcon(color: 'green' | 'red' | 'yellow', price?: number): L.DivIcon {
  const colors = {
    green:  { bg: '#22c55e', border: '#4ade80', shadow: 'rgba(34,197,94,0.4)' },
    red:    { bg: '#ef4444', border: '#f87171', shadow: 'rgba(239,68,68,0.4)' },
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

// Fly map to a given location
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

interface ParkingMapProps {
  /** Center coordinates — could be user location or a destination */
  centerLat: number;
  centerLng: number;
  /** Label for the center pin (e.g. "You" or "Destination") */
  centerLabel?: string;
  /** Spots to render on the map (parent controls fetching & filtering) */
  spots: SpotWithStatus[];
  /** Optional: fly to a different location (search result) */
  flyToLat?: number;
  flyToLng?: number;
  /** Opening a spot from the map should use the same listing UI as the list view */
  onSelectSpot?: (spot: SpotWithStatus) => void;
}

export default function ParkingMap({
  centerLat,
  centerLng,
  centerLabel = 'You',
  spots,
  flyToLat,
  flyToLng,
  onSelectSpot,
}: ParkingMapProps) {
  const handleSpotClick = useCallback(
    (spot: SpotWithStatus) => {
      onSelectSpot?.(spot);
    },
    [onSelectSpot]
  );

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
        zoomControl={false}
      >
        <TileLayer url={getTileUrl()} attribution={getTileAttribution()} />

        {/* Fly to searched location */}
        {flyToLat !== undefined && flyToLng !== undefined && (
          <FlyTo lat={flyToLat} lng={flyToLng} zoom={15} />
        )}

        {/* Center pin — user or destination */}
        <Marker
          position={[centerLat, centerLng]}
          icon={L.divIcon({
            className: 'center-marker',
            html: `<div style="width:16px;height:16px;background:#00d4ff;border:3px solid #fff;border-radius:50%;
                              box-shadow:0 0 20px rgba(0,212,255,0.6);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>
            <span style={{ color: '#000', fontSize: '12px' }}>{centerLabel}</span>
          </Popup>
        </Marker>

        {/* Parking spot markers */}
        {spots.map((spot) => (
          <Marker
            key={spot.spotId}
            position={[spot.latitude, spot.longitude]}
            icon={createMarkerIcon(spot.markerColor, spot.aiPricePerHour)}
            eventHandlers={{
              click: () => handleSpotClick(spot),
            }}
          />
        ))}
      </MapContainer>

      {/* Map Legend — bottom-left, no overlap with search */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-[#0a0a0a]/90 border border-white/[0.08] backdrop-blur-sm px-4 py-3 rounded-sm">
        <div className="flex items-center gap-4">
          {[
            { color: '#22c55e', label: 'Available' },
            { color: '#f59e0b', label: 'Ending Soon' },
            { color: '#ef4444', label: 'Booked' },
            { color: '#00d4ff', label: centerLabel },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
              />
              <span className="text-white/50 text-[10px] tracking-wider uppercase whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

