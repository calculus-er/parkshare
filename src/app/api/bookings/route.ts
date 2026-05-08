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

interface EndBookingBody {
  bookingId: string;
  action: 'end';
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
    const startTime = Timestamp.now();
    const endTime = Timestamp.fromMillis(startTime.toMillis() + durationHours * 60 * 60 * 1000);

    const overlapQuery = query(
      collection(db, 'bookings'),
      where('spotId', '==', spotId),
      where('status', 'in', ['active', 'upcoming', 'overstaying'])
    );
    const overlapSnap = await getDocs(overlapQuery);
    const hasOverlap = overlapSnap.docs.some((d) => {
      const b = d.data() as Booking;
      return b.startTime.toMillis() < endTime.toMillis() && b.endTime.toMillis() > startTime.toMillis();
    });

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This spot is no longer available for the selected time window.' },
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
    const body = (await req.json()) as EndBookingBody;
    if (!body.bookingId || body.action !== 'end') {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    await updateDoc(doc(db, 'bookings', body.bookingId), {
      status: 'completed',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update booking.' }, { status: 500 });
  }
}
