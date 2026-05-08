import { create } from 'zustand';
import { User } from 'firebase/auth';

export type UserRole = 'driver' | 'owner' | null;

interface Booking {
  bookingId: string;
  spotId: string;
  spotTitle: string;
  spotAddress: string;
  driverId: string;
  driverName: string;
  ownerId: string;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  baseRate: number;
  aiSurgeMultiplier: number;
  totalAmount: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'overstaying';
  paymentStatus: 'mock_paid' | 'pending';
}

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
