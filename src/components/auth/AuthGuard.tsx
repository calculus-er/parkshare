'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'driver' | 'owner';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!userRole) {
      router.replace('/role-select');
      return;
    }

    if (requiredRole && userRole !== requiredRole) {
      router.replace(`/${userRole}`);
      return;
    }
  }, [user, userRole, loading, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
          <span className="text-white/50 text-sm tracking-widest uppercase">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !userRole) return null;
  if (requiredRole && userRole !== requiredRole) return null;

  return <>{children}</>;
}
