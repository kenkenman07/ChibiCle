import { useRef, useCallback, useState } from 'react'
import { db } from '../lib/db'
import { haversineDistance } from '../lib/geo'
import { useRideStore } from '../stores/rideStore'

export function useGpsTracker() {
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const prevPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const totalDistanceRef = useRef(0)

  const start = useCallback((tripId: string) => {
    if (!navigator.geolocation) {
      setError('この端末ではGPSが利用できません')
      return
    }

    setError(null)
    prevPointRef.current = null
    totalDistanceRef.current = 0

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords
        const now = Date.now()

        // Filter out low-accuracy readings
        if (accuracy > 20) return

        // Speed: prefer native, fallback to Haversine calculation
        let speedKmh = 0
        if (speed != null && speed >= 0) {
          speedKmh = speed * 3.6 // m/s → km/h
        } else if (prevPointRef.current) {
          const dist = haversineDistance(
            prevPointRef.current.lat,
            prevPointRef.current.lng,
            latitude,
            longitude,
          )
          const timeDiffSec = (now - prevPointRef.current.time) / 1000
          if (timeDiffSec > 0) {
            speedKmh = (dist / timeDiffSec) * 3.6
          }
        }
        speedKmh = Math.round(speedKmh * 10) / 10

        // Accumulate distance
        if (prevPointRef.current) {
          totalDistanceRef.current += haversineDistance(
            prevPointRef.current.lat,
            prevPointRef.current.lng,
            latitude,
            longitude,
          )
        }
        prevPointRef.current = { lat: latitude, lng: longitude, time: now }

        // Update Zustand store for HUD
        useRideStore.getState().updateGps(latitude, longitude, speedKmh, accuracy)

        // Write to IndexedDB
        db.gpsPoints.add({
          tripId,
          lat: latitude,
          lng: longitude,
          speedKmh,
          accuracyM: accuracy,
          recordedAt: new Date(pos.timestamp).toISOString(),
          synced: false,
        })
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('GPS の使用が許可されていません。ブラウザの設定を確認してください。')
            break
          case err.POSITION_UNAVAILABLE:
            setError('現在地を取得できません')
            break
          case err.TIMEOUT:
            setError('GPS の応答がタイムアウトしました')
            break
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    )
  }, [])

  const stop = useCallback(async (tripId: string) => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    // Finalize trip record
    await db.trips.update(tripId, {
      endedAt: new Date().toISOString(),
      distanceM: Math.round(totalDistanceRef.current),
    })
  }, [])

  return { start, stop, error }
}
