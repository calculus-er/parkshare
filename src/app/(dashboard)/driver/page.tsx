'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import SearchBar from '@/components/driver/SearchBar';
import dynamic from 'next/dynamic';

// Dynamically import ParkingMap (Leaflet doesn't support SSR)
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

export default function DriverDashboard() {
  const [flyToLat, setFlyToLat] = useState<number | undefined>();
  const [flyToLng, setFlyToLng] = useState<number | undefined>();
  const [filters, setFilters] = useState<{
    maxPrice?: number;
    isCovered?: boolean;
    hasEVCharging?: boolean;
    hasCCTV?: boolean;
  }>({});

  const handleSearch = (lat: number, lng: number) => {
    setFlyToLat(lat);
    setFlyToLng(lng);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  return (
    <AuthGuard requiredRole="driver">
      <Navbar />
      <main className="h-screen bg-[#0a0a0a] pt-16 relative">
        {/* Full-screen Map */}
        <div className="absolute inset-0 top-16">
          <ParkingMap
            flyToLat={flyToLat}
            flyToLng={flyToLng}
            filters={filters}
          />

          {/* Search Bar overlay */}
          <SearchBar
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
          />
        </div>
      </main>
    </AuthGuard>
  );
}
