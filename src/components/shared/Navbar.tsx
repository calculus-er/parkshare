'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import toast from 'react-hot-toast';
import NotificationCenter from './NotificationCenter';
import Link from 'next/link';

export default function Navbar() {
  const { user, userRole, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
      router.push('/');
    } catch {
      toast.error('Sign out failed');
    }
  };

  const roleBadgeColor =
    userRole === 'driver'
      ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/20'
      : 'bg-purple-500/10 text-purple-400 border-purple-500/20';

  return (
    <nav className="fixed top-0 left-0 w-full z-[2500] bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/[0.06]">
      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-[#00d4ff] opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push(`/${userRole}`)}
          >
            <span className="w-8 h-8 border border-white/30 flex items-center justify-center text-xs font-medium tracking-wide text-white">
              PS
            </span>
            <span className="text-sm tracking-[0.15em] uppercase text-white font-light hidden sm:inline">
              ParkShare
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <NotificationCenter />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 py-1.5 px-3 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
              >
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <span className="text-white/80 text-sm hidden sm:inline max-w-[120px] truncate">
                  {user.displayName || 'User'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase border rounded-sm ${roleBadgeColor}`}>
                  {userRole}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-white/[0.08] shadow-xl z-50">
                    <div className="p-3 border-b border-white/[0.06]">
                      <p className="text-white text-sm truncate">{user.displayName}</p>
                      <p className="text-white/40 text-xs truncate">{user.email}</p>
                    </div>
                    {userRole === 'driver' && (
                      <Link
                        href="/driver/bookings"
                        className="block px-3 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
                        onClick={() => setMenuOpen(false)}
                      >
                        My Bookings
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
