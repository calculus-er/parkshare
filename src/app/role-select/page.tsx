'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { Car, Building2 } from 'lucide-react';

export default function RoleSelectPage() {
  const { user, loading, selectRole } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  if (!loading && !user) {
    router.replace('/login');
    return null;
  }

  const handleSelectRole = async (role: 'driver' | 'owner') => {
    setSelecting(true);
    try {
      await selectRole(role);
      toast.success(
        role === 'driver'
          ? 'Welcome, Driver! Let\'s find you a spot.'
          : 'Welcome, Owner! Let\'s list your space.'
      );
      router.push(`/${role}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-[#00d4ff]/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 -right-40 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[150px]" />

      {/* Accent line */}
      <div className="fixed top-0 left-0 w-full h-px bg-[#00d4ff] opacity-60 z-50" />

      <div className="relative z-10 w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-10 h-10 border border-white/30 flex items-center justify-center text-sm font-medium tracking-wide">
              PS
            </span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-wide mb-3">
            How will you use ParkShare?
          </h1>
          <p className="text-white/40 text-sm tracking-[0.1em]">
            Choose your role — you can always switch later
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Card */}
          <button
            onClick={() => handleSelectRole('driver')}
            disabled={selecting}
            className="group bg-white/[0.03] border border-white/[0.08] p-8 text-left
                       hover:bg-white/[0.06] hover:border-[#00d4ff]/30
                       transition-all duration-300 disabled:opacity-40
                       relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="w-14 h-14 border border-white/20 flex items-center justify-center mb-6 group-hover:border-[#00d4ff]/40 transition-colors">
                <Car className="w-7 h-7 text-white/70 group-hover:text-[#00d4ff] transition-colors" />
              </div>
              <h2 className="text-xl text-white font-light tracking-wide mb-2">
                I&apos;m a Driver
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Search for nearby parking spots, book instantly, extend your stay, and navigate there in one tap.
              </p>
              <div className="mt-6 flex items-center gap-2 text-white/30 text-xs tracking-[0.15em] uppercase group-hover:text-[#00d4ff]/60 transition-colors">
                <span>Select</span>
                <span>→</span>
              </div>
            </div>
          </button>

          {/* Owner Card */}
          <button
            onClick={() => handleSelectRole('owner')}
            disabled={selecting}
            className="group bg-white/[0.03] border border-white/[0.08] p-8 text-left
                       hover:bg-white/[0.06] hover:border-purple-400/30
                       transition-all duration-300 disabled:opacity-40
                       relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="w-14 h-14 border border-white/20 flex items-center justify-center mb-6 group-hover:border-purple-400/40 transition-colors">
                <Building2 className="w-7 h-7 text-white/70 group-hover:text-purple-400 transition-colors" />
              </div>
              <h2 className="text-xl text-white font-light tracking-wide mb-2">
                I&apos;m a Parking Owner
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                List your parking space, manage bookings, track earnings, and handle damage claims with AI.
              </p>
              <div className="mt-6 flex items-center gap-2 text-white/30 text-xs tracking-[0.15em] uppercase group-hover:text-purple-400/60 transition-colors">
                <span>Select</span>
                <span>→</span>
              </div>
            </div>
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="text-center mt-8">
            <p className="text-white/20 text-xs tracking-wide">
              Signed in as {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
