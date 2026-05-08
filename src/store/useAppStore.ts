import { create } from 'zustand';
import { User } from 'firebase/auth';
import type { Booking } from '@/types';

export type UserRole = 'driver' | 'owner' | null;

interface AppState {
  // Auth
  user: User | null;
  userRole: UserRole;
  loading: boolean;

  // Booking
  activeBooking: Booking | null;

  // Actions
  setUser: (user: User | null) => void;
  setUserRole: (role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  setActiveBooking: (booking: Booking | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  userRole: null,
  loading: true,
  activeBooking: null,

  setUser: (user) => set({ user }),
  setUserRole: (role) => set({ userRole: role }),
  setLoading: (loading) => set({ loading }),
  setActiveBooking: (booking) => set({ activeBooking: booking }),
  reset: () =>
    set({
      user: null,
      userRole: null,
      loading: false,
      activeBooking: null,
    }),
}));
