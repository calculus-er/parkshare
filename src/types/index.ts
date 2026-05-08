import { Timestamp } from 'firebase/firestore';

// ──────────────────────────────────────────────
// User
// ──────────────────────────────────────────────

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: 'driver' | 'owner';
  createdAt: Timestamp;
  behaviorScore: number; // 0–100, default 100
  blockedBy: string[]; // list of owner UIDs who blocked this driver
}

// ──────────────────────────────────────────────
// Parking Spot
// ──────────────────────────────────────────────

export type VehicleType = 'car' | 'bike' | 'truck';

export interface ParkingSpot {
  spotId?: string; // Firestore doc ID (set after creation)
  ownerId: string;
  ownerName: string;
  title: string;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  vehicleTypes: VehicleType[];
  isCovered: boolean;
  hasEVCharging: boolean;
  hasCCTV: boolean;
  baseHourlyRate: number; // in INR
  baseDailyRate: number;
  availableFrom: string; // HH:mm
  availableTo: string; // HH:mm
  images: string[]; // Firebase Storage URLs
  isActive: boolean;
  totalSpots: number; // how many vehicles can park simultaneously
  totalBookings: number;
  averageRating: number;
}

export interface SpotWithStatus extends ParkingSpot {
  distanceKm: number;
  markerColor: 'green' | 'red' | 'yellow';
  aiPricePerHour?: number;
  aiSurgeMultiplier?: number;
  aiPricingReason?: string;
  aiDemandLevel?: DemandLevel;
}

// ──────────────────────────────────────────────
// Booking
// ──────────────────────────────────────────────

export type BookingStatus =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'overstaying';

export type PaymentStatus = 'mock_paid' | 'pending';

export type DamageClaimStatus = 'none' | 'pending' | 'resolved';

export interface ExtensionRequest {
  requestedAt: Timestamp;
  extensionHours: number;
  additionalAmount: number;
  status: 'pending' | 'approved' | 'denied';
  conflictId: string | null; // links to conflictRequests if there was a conflict
}

export interface DamageReport {
  damageDetected: boolean;
  confidenceScore: number; // 0–100
  suspectedDamageAreas: string[];
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  estimatedRepairCost: number; // in INR
  recommendation: 'dismiss' | 'investigate' | 'compensate';
  aiRemarks: string;
  driverNote: string;
  submittedAt: Timestamp;
}

export interface Booking {
  bookingId?: string; // Firestore doc ID
  spotId: string;
  spotTitle: string;
  spotAddress: string;
  driverId: string;
  driverName: string;
  ownerId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  durationHours: number;
  baseRate: number;
  aiSurgeMultiplier: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  extensionRequests: ExtensionRequest[];
  entryVideoURL: string | null;
  exitVideoURL: string | null;
  damageClaimStatus: DamageClaimStatus;
  damageReport: DamageReport | null;
  rating?: number;
  reviewText?: string;
  ratedAt?: Timestamp | null;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// Conflict Resolution
// ──────────────────────────────────────────────

export interface AlternateSpot {
  spotId: string;
  title: string;
  address: string;
  distanceKm: number;
  hourlyRate: number;
}

export interface ConflictRequest {
  conflictId?: string; // Firestore doc ID
  currentBookingId: string;
  nextBookingId: string;
  currentDriverId: string;
  nextDriverId: string;
  spotId: string;
  extensionHours: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  compensationOffer: number; // in INR
  alternateSpots: AlternateSpot[];
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
}

// ──────────────────────────────────────────────
// Notification
// ──────────────────────────────────────────────

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_starting'
  | 'overstay_detected'
  | 'extension_conflict'
  | 'conflict_resolved'
  | 'tow_escalation'
  | 'damage_claim';

export interface AppNotification {
  notificationId?: string;
  uid: string; // recipient user ID
  type: NotificationType;
  message: string;
  metadata: Record<string, string>; // flexible key-value context
  read: boolean;
  createdAt: Timestamp;
}

// ──────────────────────────────────────────────
// AI Pricing Response
// ──────────────────────────────────────────────

export type DemandLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface AIPricingResponse {
  surgeMultiplier: number;
  finalPrice: number;
  reasoning: string;
  demandLevel: DemandLevel;
}

// ──────────────────────────────────────────────
// AI Conflict Response
// ──────────────────────────────────────────────

export interface AIConflictResponse {
  compensationAmount: number;
  compensationReason: string;
  alternateSpotRecommendation: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  resolutionStrategy: string;
}

// ──────────────────────────────────────────────
// AI Damage Response
// ──────────────────────────────────────────────

export interface AIDamageResponse {
  damageDetected: boolean;
  confidenceScore: number;
  suspectedDamageAreas: string[];
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  estimatedRepairCost: number;
  recommendation: 'dismiss' | 'investigate' | 'compensate';
  aiRemarks: string;
}
