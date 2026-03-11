import { create } from 'zustand'

interface RideState {
  isRiding: boolean
  tripId: string | null
  currentSpeed: number
  currentAccuracy: number
  currentLat: number | null
  currentLng: number | null
  violationCount: number
  elapsedSeconds: number

  startRide: (tripId: string) => void
  endRide: () => void
  updateGps: (lat: number, lng: number, speed: number, accuracy: number) => void
  incrementViolations: () => void
  tick: () => void
}

export const useRideStore = create<RideState>((set) => ({
  isRiding: false,
  tripId: null,
  currentSpeed: 0,
  currentAccuracy: 0,
  currentLat: null,
  currentLng: null,
  violationCount: 0,
  elapsedSeconds: 0,

  startRide: (tripId) =>
    set({
      isRiding: true,
      tripId,
      currentSpeed: 0,
      currentAccuracy: 0,
      currentLat: null,
      currentLng: null,
      violationCount: 0,
      elapsedSeconds: 0,
    }),

  endRide: () =>
    set({
      isRiding: false,
      tripId: null,
      currentSpeed: 0,
      currentAccuracy: 0,
      currentLat: null,
      currentLng: null,
    }),

  updateGps: (lat, lng, speed, accuracy) =>
    set({ currentLat: lat, currentLng: lng, currentSpeed: speed, currentAccuracy: accuracy }),

  incrementViolations: () => set((s) => ({ violationCount: s.violationCount + 1 })),

  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
