'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileUrl, getTileAttribution } from '@/lib/mapbox';

// Fix Leaflet default marker icon issue in Next.js/webpack
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);

  return null;
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  return (
    <div className="w-full h-64 border border-white/[0.08] overflow-hidden rounded-sm">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        className="w-full h-full"
        style={{ background: '#0a0a0a' }}
      >
        <TileLayer
          url={getTileUrl()}
          attribution={getTileAttribution()}
        />
        <RecenterMap lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={defaultIcon} />
        <ClickHandler onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
