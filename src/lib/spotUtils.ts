import { ParkingSpot, Booking, SpotWithStatus } from '@/types';
import { getDistanceKm } from './mapbox';
import { getBookingsForSpot } from './firestore';

export async function enrichSpotsWithStatus(
  allSpots: ParkingSpot[],
  refLat: number,
  refLng: number,
): Promise<SpotWithStatus[]> {
  return Promise.all(
    allSpots.map(async (spot) => {
      const distanceKm = getDistanceKm(refLat, refLng, spot.latitude, spot.longitude);
      let markerColor: 'green' | 'red' | 'yellow' = 'green';
      const totalSpots = spot.totalSpots ?? 1;

      try {
        const bookings = await getBookingsForSpot(spot.spotId || '');
        const now = Date.now();

        // Count concurrent active/overstaying bookings
        const activeBookings = bookings.filter(
          (b: Booking) =>
            (b.status === 'active' || b.status === 'overstaying') &&
            b.startTime.toMillis() <= now &&
            b.endTime.toMillis() > now - 30 * 60 * 1000 // include overstay window
        );

        if (activeBookings.length >= totalSpots) {
          // All slots occupied — check if any are ending soon
          const endingSoon = activeBookings.some((b: Booking) => {
            const timeLeft = b.endTime.toMillis() - now;
            return timeLeft > 0 && timeLeft <= 30 * 60 * 1000;
          });
          markerColor = endingSoon ? 'yellow' : 'red';
        }
        // else: at least one slot free → stays green
      } catch {
        // Default to available
      }

      return { ...spot, distanceKm, markerColor };
    })
  );
}
