import { NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase/app';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore/lite';
import type { Booking, ParkingSpot } from '@/types';

interface CreateBookingBody {
  spotId: string;
  driverId: string;
  driverName: string;
  durationHours: number;
  aiPricePerHour: number;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBookingBody;
    const { spotId, driverId, driverName, durationHours, aiPricePerHour } = body;

    if (!spotId || !driverId || !driverName || !durationHours || durationHours <= 0 || !aiPricePerHour) {
      return NextResponse.json({ error: 'Invalid booking payload.' }, { status: 400 });
    }

    const spotSnap = await getDoc(doc(db, 'parkingSpots', spotId));
    if (!spotSnap.exists()) {
      return NextResponse.json({ error: 'Parking spot not found.' }, { status: 404 });
    }

    const spot = { ...spotSnap.data(), spotId: spotSnap.id } as ParkingSpot;
    const totalSpots = spot.totalSpots ?? 1; // backwards compat for spots created before this field existed
    const startTime = Timestamp.now();
    const endTime = Timestamp.fromMillis(startTime.toMillis() + durationHours * 60 * 60 * 1000);

    // Count how many bookings overlap with the requested time window
    const overlapQuery = query(
      collection(db, 'bookings'),
      where('spotId', '==', spotId)
    );
    const overlapSnap = await getDocs(overlapQuery);
    let concurrentBookings = 0;
    overlapSnap.docs.forEach((d) => {
      const b = d.data() as Booking;
      if (!['active', 'upcoming', 'overstaying'].includes(b.status)) return;
      if (b.startTime.toMillis() < endTime.toMillis() && b.endTime.toMillis() > startTime.toMillis()) {
        concurrentBookings++;
      }
    });

    if (concurrentBookings >= totalSpots) {
      return NextResponse.json(
        { error: `All ${totalSpots} spot(s) at this location are booked for the selected time.` },
        { status: 409 }
      );
    }

    const baseRate = spot.baseHourlyRate;
    const aiSurgeMultiplier = Number(Math.max(1, aiPricePerHour / baseRate).toFixed(2));
    const totalAmount = Math.round(aiPricePerHour * durationHours);

    const bookingPayload: Omit<Booking, 'bookingId' | 'createdAt'> = {
      spotId,
      spotTitle: spot.title,
      spotAddress: spot.address,
      driverId,
      driverName,
      ownerId: spot.ownerId,
      startTime,
      endTime,
      durationHours,
      baseRate,
      aiSurgeMultiplier,
      totalAmount,
      status: 'active',
      paymentStatus: 'mock_paid',
      extensionRequests: [],
      entryVideoURL: null,
      exitVideoURL: null,
      damageClaimStatus: 'none',
      damageReport: null,
    };

    const createdRef = await addDoc(collection(db, 'bookings'), {
      ...bookingPayload,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'parkingSpots', spotId), {
      totalBookings: increment(1),
    });

    return NextResponse.json({
      bookingId: createdRef.id,
      ...bookingPayload,
      startTimeMs: startTime.toMillis(),
      endTimeMs: endTime.toMillis(),
    });
  } catch {
    return NextResponse.json({ error: 'Unable to create booking.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    if (!body.bookingId || !body.action) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    if (body.action === 'end') {
      await updateDoc(doc(db, 'bookings', body.bookingId), {
        status: 'completed',
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'extend') {
      const { bookingId, extensionHours, additionalAmount } = body;
      if (!extensionHours || extensionHours <= 0) {
        return NextResponse.json({ error: 'Invalid extension hours.' }, { status: 400 });
      }

      const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingSnap.exists()) {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }
      const booking = bookingSnap.data() as Booking;

      const currentEnd = booking.endTime.toMillis();
      const newEnd = Timestamp.fromMillis(currentEnd + extensionHours * 60 * 60 * 1000);

      // Check if extending would collide with other bookings at this spot
      const spotSnap = await getDoc(doc(db, 'parkingSpots', booking.spotId));
      const spotData = spotSnap.exists() ? spotSnap.data() as ParkingSpot : null;
      const totalSpots = spotData?.totalSpots ?? 1;

      const overlapQuery = query(
        collection(db, 'bookings'),
        where('spotId', '==', booking.spotId)
      );
      const overlapSnap = await getDocs(overlapQuery);

      let conflictingBooking: (Booking & { bookingId: string }) | null = null;
      let concurrentCount = 0;

      overlapSnap.docs.forEach((d) => {
        if (d.id === bookingId) return; // skip our own booking
        const b = d.data() as Booking;
        if (!['active', 'upcoming', 'overstaying'].includes(b.status)) return;
        // Check if this booking overlaps with the extended window
        if (b.startTime.toMillis() < newEnd.toMillis() && b.endTime.toMillis() > currentEnd) {
          concurrentCount++;
          if (!conflictingBooking) {
            conflictingBooking = { ...b, bookingId: d.id };
          }
        }
      });

      // If extending fills all spots → there's a conflict
      const hasConflict = concurrentCount >= totalSpots;

      if (hasConflict && conflictingBooking) {
        return NextResponse.json({
          conflict: true,
          conflictingBooking: {
            bookingId: (conflictingBooking as Booking & { bookingId: string }).bookingId,
            driverName: (conflictingBooking as Booking).driverName,
            driverId: (conflictingBooking as Booking).driverId,
            startTimeMs: (conflictingBooking as Booking).startTime.toMillis(),
            endTimeMs: (conflictingBooking as Booking).endTime.toMillis(),
          },
          message: 'Extension conflicts with an upcoming booking. Conflict resolution required.',
        }, { status: 409 });
      }

      // No conflict — apply extension directly
      const extensionRecord = {
        requestedAt: Timestamp.now(),
        extensionHours,
        additionalAmount: additionalAmount || 0,
        status: 'approved',
        conflictId: null,
      };

      await updateDoc(doc(db, 'bookings', bookingId), {
        endTime: newEnd,
        durationHours: booking.durationHours + extensionHours,
        totalAmount: booking.totalAmount + (additionalAmount || 0),
        extensionRequests: [...(booking.extensionRequests || []), extensionRecord],
      });

      return NextResponse.json({
        success: true,
        newEndTimeMs: newEnd.toMillis(),
        extensionHours,
      });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to update booking.' }, { status: 500 });
  }
}
