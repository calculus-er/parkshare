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

      try {
        const bookings = await getBookingsForSpot(spot.spotId || '');
        const now = Date.now();
        const activeBooking = bookings.find(
          (b: Booking) => b.status === 'active' || b.status === 'overstaying'
        );

        if (activeBooking) {
          const endTime = activeBooking.endTime.toMillis();
          const timeLeft = endTime - now;
          if (timeLeft <= 30 * 60 * 1000 && timeLeft > 0) {
            markerColor = 'yellow';
          } else {
            markerColor = 'red';
          }
        }
      } catch {
        // Default to available
      }

      return { ...spot, distanceKm, markerColor };
    })
  );
}
