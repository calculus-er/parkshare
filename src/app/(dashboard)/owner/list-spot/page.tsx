'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { createParkingSpot } from '@/lib/firestore';
import { useAppStore } from '@/store/useAppStore';
import { VehicleType } from '@/types';
import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/shared/Navbar';
import dynamic from 'next/dynamic';
import {
  MapPin, Upload, X, Car, Bike, Truck,
  Shield, Zap, Eye, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically import the map component (Leaflet doesn't work SSR)
const MapPicker = dynamic(() => import('@/components/map/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
      <span className="text-white/30 text-xs tracking-wider uppercase">Loading map...</span>
    </div>
  ),
});

export default function ListSpotPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(28.6139); // Default: Delhi
  const [longitude, setLongitude] = useState(77.209);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(['car']);
  const [isCovered, setIsCovered] = useState(false);
  const [hasEVCharging, setHasEVCharging] = useState(false);
  const [hasCCTV, setHasCCTV] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [availableFrom, setAvailableFrom] = useState('08:00');
  const [availableTo, setAvailableTo] = useState('22:00');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const toggleVehicleType = (type: VehicleType) => {
    setVehicleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !address || !hourlyRate || !dailyRate) {
      toast.error('Please fill all required fields');
      return;
    }
    if (vehicleTypes.length === 0) {
      toast.error('Select at least one vehicle type');
      return;
    }

    setSubmitting(true);
    try {
      // Upload images to Firebase Storage
      const imageURLs: string[] = [];
      for (const file of imageFiles) {
        const storageRef = ref(
          storage,
          `spots/${user.uid}/${Date.now()}_${file.name}`
        );
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        imageURLs.push(url);
      }

      // Create spot in Firestore
      await createParkingSpot({
        ownerId: user.uid,
        ownerName: user.displayName || 'Owner',
        title,
        address,
        description,
        latitude,
        longitude,
        vehicleTypes,
        isCovered,
        hasEVCharging,
        hasCCTV,
        baseHourlyRate: Number(hourlyRate),
        baseDailyRate: Number(dailyRate),
        availableFrom,
        availableTo,
        images: imageURLs,
        isActive: true,
        totalBookings: 0,
        averageRating: 0,
      });

      toast.success('Parking spot listed successfully!');
      router.push('/owner');
    } catch (error) {
      console.error('Error creating spot:', error);
      toast.error('Failed to create parking spot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard requiredRole="owner">
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-white tracking-wide">
              List a Parking Spot
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Fill in the details below to list your space
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Covered Parking near MG Road"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Park Lane, Delhi"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe your parking spot..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                           placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors resize-none"
              />
            </div>

            {/* Map Pin Picker */}
            <div>
              <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                <MapPin className="w-3 h-3 inline mr-1" />
                Location — Click the map to set pin
              </label>
              <MapPicker
                lat={latitude}
                lng={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
              <div className="flex gap-4 mt-2">
                <p className="text-white/20 text-xs">Lat: {latitude.toFixed(6)}</p>
                <p className="text-white/20 text-xs">Lng: {longitude.toFixed(6)}</p>
              </div>
            </div>

            {/* Vehicle Types */}
            <div>
              <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-3">
                Vehicle Types *
              </label>
              <div className="flex gap-3">
                {[
                  { type: 'car' as VehicleType, icon: Car, label: 'Car' },
                  { type: 'bike' as VehicleType, icon: Bike, label: 'Bike' },
                  { type: 'truck' as VehicleType, icon: Truck, label: 'Truck' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleVehicleType(type)}
                    className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-wider uppercase transition-all ${
                      vehicleTypes.includes(type)
                        ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                        : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-3">
                Features
              </label>
              <div className="flex gap-3 flex-wrap">
                {[
                  { key: 'covered', icon: Shield, label: 'Covered', value: isCovered, setter: setIsCovered },
                  { key: 'ev', icon: Zap, label: 'EV Charging', value: hasEVCharging, setter: setHasEVCharging },
                  { key: 'cctv', icon: Eye, label: 'CCTV', value: hasCCTV, setter: setHasCCTV },
                ].map(({ key, icon: Icon, label, value, setter }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setter(!value)}
                    className={`flex items-center gap-2 px-4 py-2.5 border text-xs tracking-wider uppercase transition-all ${
                      value
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Hourly Rate (₹) *
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 80"
                  min="1"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Daily Rate (₹) *
                </label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  placeholder="e.g. 500"
                  min="1"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Availability */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Available From
                </label>
                <input
                  type="time"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                  Available To
                </label>
                <input
                  type="time"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] text-white text-sm
                             focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-2">
                Photos (up to 5)
              </label>
              <div className="flex gap-3 flex-wrap">
                {imagePreviews.map((preview, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 border border-white/[0.08] overflow-hidden group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 flex items-center justify-center
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 border border-dashed border-white/[0.15] flex flex-col items-center justify-center gap-1
                               hover:border-[#00d4ff]/30 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-white/30" />
                    <span className="text-white/30 text-[9px]">Upload</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 border border-white/20 bg-white/[0.03] text-white text-sm tracking-[0.15em] uppercase
                         hover:bg-white hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'List Parking Spot'
              )}
            </button>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
