import { create } from 'zustand'

export interface RouteData {
  geometry: number[][]
  intersections: Array<{
    index: number
    lat: number
    lng: number
    num_roads: number
    stopped: boolean
    min_speed_kmh: number | null
  }>
  distance_m: number
  duration_s: number
}

interface RideState {
  isRiding: boolean
  tripId: string | null
  currentSpeed: number
  currentAccuracy: number
  currentLat: number | null
  currentLng: number | null
  elapsedSeconds: number

  // 出発地
  originLat: number | null
  originLng: number | null
  originName: string | null

  // 目的地・ルート
  destinationLat: number | null
  destinationLng: number | null
  destinationName: string | null
  route: RouteData | null

  // 交差点トラッキング
  totalIntersections: number
  stoppedIntersections: number

  setOrigin: (lat: number, lng: number, name: string | null) => void
  setDestination: (lat: number, lng: number, name: string | null) => void
  startRide: (tripId: string) => void
  endRide: () => void
  updateGps: (lat: number, lng: number, speed: number, accuracy: number) => void
  setRoute: (route: RouteData) => void
  updateIntersections: (total: number, stopped: number) => void
  tick: () => void
}

export const useRideStore = create<RideState>((set) => ({
  isRiding: false,
  tripId: null,
  currentSpeed: 0,
  currentAccuracy: 0,
  currentLat: null,
  currentLng: null,
  elapsedSeconds: 0,
  originLat: null,
  originLng: null,
  originName: null,
  destinationLat: null,
  destinationLng: null,
  destinationName: null,
  route: null,
  totalIntersections: 0,
  stoppedIntersections: 0,

  setOrigin: (lat, lng, name) =>
    set({ originLat: lat, originLng: lng, originName: name }),

  setDestination: (lat, lng, name) =>
    set({ destinationLat: lat, destinationLng: lng, destinationName: name }),

  startRide: (tripId) =>
    set({
      isRiding: true,
      tripId,
      currentSpeed: 0,
      currentAccuracy: 0,
      currentLat: null,
      currentLng: null,
      elapsedSeconds: 0,
      // 注意: route, origin, destination, totalIntersections, stoppedIntersections は
      // 意図的にリセットしない — ルート計画時に設定され、
      // 走行フェーズまで保持する必要がある。
    }),

  endRide: () =>
    set({
      isRiding: false,
      tripId: null,
      currentSpeed: 0,
      currentAccuracy: 0,
      currentLat: null,
      currentLng: null,
      originLat: null,
      originLng: null,
      originName: null,
      destinationLat: null,
      destinationLng: null,
      destinationName: null,
      route: null,
      totalIntersections: 0,
      stoppedIntersections: 0,
    }),

  updateGps: (lat, lng, speed, accuracy) =>
    set({ currentLat: lat, currentLng: lng, currentSpeed: speed, currentAccuracy: accuracy }),

  setRoute: (route) =>
    set({
      route,
      totalIntersections: route.intersections.length,
      stoppedIntersections: route.intersections.filter((ix) => ix.stopped).length,
    }),

  updateIntersections: (total, stopped) =>
    set({ totalIntersections: total, stoppedIntersections: stopped }),

  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
