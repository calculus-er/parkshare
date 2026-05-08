import { ParkingSpot, Booking, SpotWithStatus } from '@/types';
import { getDistanceKm } from './mapbox';
import { getBookingsForSpot } from './firestore';

export async function enrichSpotsWithStatus(
  allSpots: ParkingSpot[],
  refLat: number,
  refLng: number,
  window?: { startTimeMs: number; endTimeMs: number }
): Promise<SpotWithStatus[]> {
  return Promise.all(
    allSpots.map(async (spot) => {
      const distanceKm = getDistanceKm(refLat, refLng, spot.latitude, spot.longitude);
      let markerColor: 'green' | 'red' | 'yellow' = 'green';
      const totalSpots = spot.totalSpots ?? 1;

      try {
        const bookings = await getBookingsForSpot(spot.spotId || '');
        const referenceStart = window?.startTimeMs ?? Date.now();
        const referenceEnd = window?.endTimeMs ?? referenceStart + 60 * 60 * 1000;

        const relevantBookings = bookings.filter(
          (b: Booking) =>
            (b.status === 'active' || b.status === 'overstaying' || b.status === 'upcoming') &&
            b.startTime.toMillis() < referenceEnd &&
            b.endTime.toMillis() > referenceStart
        );

        const bookingsAtWindowStart = relevantBookings.filter(
          (b: Booking) => b.startTime.toMillis() <= referenceStart && b.endTime.toMillis() > referenceStart
        );

        if (bookingsAtWindowStart.length >= totalSpots) {
          const endingSoon = bookingsAtWindowStart.some((b: Booking) => {
            const timeLeft = b.endTime.toMillis() - referenceStart;
            return timeLeft > 0 && timeLeft <= 30 * 60 * 1000;
          });
          markerColor = endingSoon ? 'yellow' : 'red';
        }
      } catch {
        // Default to available
      }

      return { ...spot, distanceKm, markerColor };
    })
  );
}

export async function filterSpotsByWindowAvailability(
  spots: SpotWithStatus[],
  startTimeMs: number,
  endTimeMs: number
): Promise<SpotWithStatus[]> {
  const availability = await Promise.all(
    spots.map(async (spot) => {
      const totalSpots = spot.totalSpots ?? 1;
      try {
        const bookings = await getBookingsForSpot(spot.spotId || '');
        const overlapping = bookings
          .filter(
          (b: Booking) =>
            (b.status === 'active' || b.status === 'upcoming' || b.status === 'overstaying') &&
            b.startTime.toMillis() < endTimeMs &&
            b.endTime.toMillis() > startTimeMs
          )
          .map((b) => ({
            start: Math.max(startTimeMs, b.startTime.toMillis()),
            end: Math.min(endTimeMs, b.endTime.toMillis()),
          }));

        const events: Array<{ at: number; delta: number }> = [];
        for (const o of overlapping) {
          events.push({ at: o.start, delta: 1 });
          events.push({ at: o.end, delta: -1 });
        }
        events.sort((a, b) => (a.at === b.at ? a.delta - b.delta : a.at - b.at));

        let concurrent = 0;
        let maxConcurrent = 0;
        for (const e of events) {
          concurrent += e.delta;
          if (concurrent > maxConcurrent) maxConcurrent = concurrent;
        }

        return maxConcurrent < totalSpots ? spot : null;
      } catch {
        return spot;
      }
    })
  );

  return availability.filter((spot): spot is SpotWithStatus => Boolean(spot));
}
