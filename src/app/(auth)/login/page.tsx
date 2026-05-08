'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signInWithGoogle, user, userRole, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  // If already logged in, redirect
  if (!loading && user && userRole) {
    router.replace(`/${userRole}`);
    return null;
  }
  if (!loading && user && !userRole) {
    router.replace('/role-select');
    return null;
  }

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithGoogle();
      toast.success('Signed in successfully!');
      if (result.isNewUser || !result.role) {
        router.push('/role-select');
      } else {
        router.push(`/${result.role}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      toast.error(errorMessage);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00d4ff]/3 rounded-full blur-[120px]" />

      {/* Accent line */}
      <div className="fixed top-0 left-0 w-full h-px bg-[#00d4ff] opacity-60 z-50" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="w-10 h-10 border border-white/30 flex items-center justify-center text-sm font-medium tracking-wide">
              PS
            </span>
            <span className="text-2xl tracking-[0.2em] uppercase text-white font-light">
              ParkShare
            </span>
          </div>
          <p className="text-white/40 text-sm tracking-[0.15em] uppercase">
            Smart Parking Marketplace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-8 rounded-sm">
          <h1 className="text-xl font-light text-white text-center mb-2 tracking-wide">
            Welcome Back
          </h1>
          <p className="text-white/40 text-center text-sm mb-8">
            Sign in to find or manage parking spots
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn || loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6
                       border border-white/20 bg-white/[0.03] text-white
                       hover:bg-white hover:text-black
                       transition-all duration-300
                       disabled:opacity-40 disabled:cursor-not-allowed
                       group tracking-wide text-sm uppercase"
          >
            {signingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="text-white/20 text-xs text-center mt-6 tracking-wide">
            By signing in, you agree to our Terms of Service
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-white/30 text-xs tracking-[0.2em] uppercase hover:text-white/60 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
