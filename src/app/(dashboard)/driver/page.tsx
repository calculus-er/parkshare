'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';

export default function DriverDashboard() {
  return (
    <AuthGuard requiredRole="driver">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-white tracking-wide">
              Driver Dashboard
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Find and manage your parking spots
            </p>
          </div>

          {/* Placeholder — Map and booking UI will be built in Phase 5 */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-sm p-12 text-center">
            <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗺️</span>
            </div>
            <h2 className="text-white/60 text-lg font-light mb-2">
              Map Coming Soon
            </h2>
            <p className="text-white/30 text-sm max-w-md mx-auto">
              The interactive parking map with live availability, AI pricing, and instant booking will appear here.
            </p>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
