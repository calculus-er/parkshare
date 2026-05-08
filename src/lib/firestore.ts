import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  AppUser,
  ParkingSpot,
  Booking,
  BookingStatus,
  ConflictRequest,
} from '@/types';
import { getDistanceKm } from './mapbox';

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────

export async function createUser(user: Omit<AppUser, 'createdAt'>): Promise<void> {
  await setDoc(doc(db, 'users', user.uid), {
    ...user,
    createdAt: serverTimestamp(),
  });
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ({ ...snap.data(), uid: snap.id } as AppUser) : null;
}

export async function updateUser(
  uid: string,
  data: Partial<AppUser>
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
}

// ──────────────────────────────────────────────
// Parking Spots
// ──────────────────────────────────────────────

export async function createParkingSpot(
  spot: Omit<ParkingSpot, 'spotId'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'parkingSpots'), spot);
  return docRef.id;
}

export async function getParkingSpot(spotId: string): Promise<ParkingSpot | null> {
  const snap = await getDoc(doc(db, 'parkingSpots', spotId));
  return snap.exists()
    ? ({ ...snap.data(), spotId: snap.id } as ParkingSpot)
    : null;
}

export async function getParkingSpots(filters?: {
  ownerId?: string;
  vehicleType?: string;
  isCovered?: boolean;
  hasEVCharging?: boolean;
  hasCCTV?: boolean;
  activeOnly?: boolean;
}): Promise<ParkingSpot[]> {
  let q = query(collection(db, 'parkingSpots'));

  if (filters?.ownerId) {
    q = query(q, where('ownerId', '==', filters.ownerId));
  }
  if (filters?.activeOnly !== false) {
    q = query(q, where('isActive', '==', true));
  }

  const snap = await getDocs(q);
  let spots = snap.docs.map(
    (d) => ({ ...d.data(), spotId: d.id } as ParkingSpot)
  );

  // Client-side filters (Firestore doesn't support multiple inequality filters)
  if (filters?.vehicleType) {
    spots = spots.filter((s) =>
      s.vehicleTypes.includes(filters.vehicleType as ParkingSpot['vehicleTypes'][number])
    );
  }
  if (filters?.isCovered !== undefined) {
    spots = spots.filter((s) => s.isCovered === filters.isCovered);
  }
  if (filters?.hasEVCharging !== undefined) {
    spots = spots.filter((s) => s.hasEVCharging === filters.hasEVCharging);
  }
  if (filters?.hasCCTV !== undefined) {
    spots = spots.filter((s) => s.hasCCTV === filters.hasCCTV);
  }

  return spots;
}

export async function getNearbySpots(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<(ParkingSpot & { distanceKm: number })[]> {
  // Get all active spots (Firestore doesn't have native geo queries without GeoFire)
  const spots = await getParkingSpots({ activeOnly: true });

  return spots
    .map((spot) => ({
      ...spot,
      distanceKm: getDistanceKm(lat, lng, spot.latitude, spot.longitude),
    }))
    .filter((spot) => spot.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function updateParkingSpot(
  spotId: string,
  data: Partial<ParkingSpot>
): Promise<void> {
  await updateDoc(doc(db, 'parkingSpots', spotId), data);
}

export function subscribeToParkingSpots(
  callback: (spots: ParkingSpot[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'parkingSpots'),
    where('isActive', '==', true)
  );
  return onSnapshot(q, (snap) => {
    const spots = snap.docs.map(
      (d) => ({ ...d.data(), spotId: d.id } as ParkingSpot)
    );
    callback(spots);
  });
}

// ──────────────────────────────────────────────
// Bookings
// ──────────────────────────────────────────────

export async function createBooking(
  booking: Omit<Booking, 'bookingId' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'bookings'), {
    ...booking,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const snap = await getDoc(doc(db, 'bookings', bookingId));
  return snap.exists()
    ? ({ ...snap.data(), bookingId: snap.id } as Booking)
    : null;
}

export async function getActiveBookingForDriver(
  driverId: string
): Promise<Booking | null> {
  const q = query(
    collection(db, 'bookings'),
    where('driverId', '==', driverId),
    where('status', 'in', ['active', 'upcoming', 'overstaying'])
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), bookingId: d.id } as Booking;
}

export async function getBookingsForSpot(spotId: string): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('spotId', '==', spotId),
    orderBy('startTime', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ ...d.data(), bookingId: d.id } as Booking)
  );
}

export async function getBookingsForOwner(ownerId: string): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ ...d.data(), bookingId: d.id } as Booking)
  );
}

export async function getBookingsForDriver(driverId: string): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('driverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ ...d.data(), bookingId: d.id } as Booking)
  );
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), { status });
}

export async function updateBooking(
  bookingId: string,
  data: Partial<Booking>
): Promise<void> {
  await updateDoc(doc(db, 'bookings', bookingId), data);
}

export function subscribeToBooking(
  bookingId: string,
  callback: (booking: Booking | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
    callback(
      snap.exists()
        ? ({ ...snap.data(), bookingId: snap.id } as Booking)
        : null
    );
  });
}

export function subscribeToOwnerBookings(
  ownerId: string,
  callback: (bookings: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'bookings'),
    where('ownerId', '==', ownerId)
  );
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map(
      (d) => ({ ...d.data(), bookingId: d.id } as Booking)
    );
    callback(bookings);
  });
}

// ──────────────────────────────────────────────
// Conflict Requests
// ──────────────────────────────────────────────

export async function createConflictRequest(
  conflict: Omit<ConflictRequest, 'conflictId' | 'createdAt' | 'resolvedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'conflictRequests'), {
    ...conflict,
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });
  return docRef.id;
}

export async function updateConflictRequest(
  conflictId: string,
  data: Partial<ConflictRequest>
): Promise<void> {
  await updateDoc(doc(db, 'conflictRequests', conflictId), data);
}

export async function getConflictRequest(
  conflictId: string
): Promise<ConflictRequest | null> {
  const snap = await getDoc(doc(db, 'conflictRequests', conflictId));
  return snap.exists()
    ? ({ ...snap.data(), conflictId: snap.id } as ConflictRequest)
    : null;
}

// ──────────────────────────────────────────────
// Booking Overlap Check
// ──────────────────────────────────────────────

export async function checkBookingOverlap(
  spotId: string,
  startTime: Timestamp,
  endTime: Timestamp
): Promise<Booking | null> {
  const q = query(
    collection(db, 'bookings'),
    where('spotId', '==', spotId),
    where('status', 'in', ['active', 'upcoming'])
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const booking = { ...d.data(), bookingId: d.id } as Booking;
    const bStart = booking.startTime.toMillis();
    const bEnd = booking.endTime.toMillis();
    const rStart = startTime.toMillis();
    const rEnd = endTime.toMillis();

    // Overlap: existing booking starts before requested end AND ends after requested start
    if (bStart < rEnd && bEnd > rStart) {
      return booking;
    }
  }

  return null;
}

// ──────────────────────────────────────────────
// Get Next Booking (for conflict detection)
// ──────────────────────────────────────────────

export async function getNextBookingForSpot(
  spotId: string,
  afterTime: Timestamp
): Promise<Booking | null> {
  const q = query(
    collection(db, 'bookings'),
    where('spotId', '==', spotId),
    where('status', '==', 'upcoming'),
    orderBy('startTime', 'asc')
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const booking = { ...d.data(), bookingId: d.id } as Booking;
    if (booking.startTime.toMillis() >= afterTime.toMillis()) {
      return booking;
    }
  }

  return null;
}
