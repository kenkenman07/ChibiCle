import { useRef, useCallback, useState } from 'react'
import { db } from '../lib/db'
import { haversineDistance } from '../lib/geo'
import { useRideStore } from '../stores/rideStore'

const SYNC_INTERVAL_MS = 5000

export function useGpsTracker() {
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const prevPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const totalDistanceRef = useRef(0)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSync = useCallback((tripId: string) => {
    syncIntervalRef.current = setInterval(async () => {
      try {
        const unsynced = await db.gpsPoints
          .where('tripId')
          .equals(tripId)
          .and((p) => !p.synced)
          .toArray()

        if (unsynced.length === 0) return

        const res = await fetch('/api/gps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trip_id: tripId,
            points: unsynced.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              speed_kmh: p.speedKmh,
              accuracy_m: p.accuracyM,
              recorded_at: p.recordedAt,
            })),
          }),
        })

        if (res.ok) {
          // Mark as synced
          const ids = unsynced.map((p) => p.id!).filter(Boolean)
          await db.gpsPoints.where('id').anyOf(ids).modify({ synced: true })

          // Handle violations from server
          const data = await res.json()
          if (data.violations?.length > 0) {
            for (const v of data.violations) {
              await db.violations.add({
                tripId,
                type: v.type,
                detectedAt: v.detected_at,
                lat: v.lat,
                lng: v.lng,
              })
              useRideStore.getState().incrementViolations()
            }
          }
        }
      } catch {
        // Network error — will retry next interval
      }
    }, SYNC_INTERVAL_MS)
  }, [])

  const start = useCallback(
    (tripId: string) => {
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

          if (accuracy > 20) return

          let speedKmh = 0
          if (speed != null && speed >= 0) {
            speedKmh = speed * 3.6
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

          if (prevPointRef.current) {
            totalDistanceRef.current += haversineDistance(
              prevPointRef.current.lat,
              prevPointRef.current.lng,
              latitude,
              longitude,
            )
          }
          prevPointRef.current = { lat: latitude, lng: longitude, time: now }

          useRideStore.getState().updateGps(latitude, longitude, speedKmh, accuracy)

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

      // Start batch sync to backend
      startSync(tripId)
    },
    [startSync],
  )

  const stop = useCallback(async (tripId: string) => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    // Final flush of unsynced points
    try {
      const unsynced = await db.gpsPoints
        .where('tripId')
        .equals(tripId)
        .and((p) => !p.synced)
        .toArray()

      if (unsynced.length > 0) {
        const res = await fetch('/api/gps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trip_id: tripId,
            points: unsynced.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              speed_kmh: p.speedKmh,
              accuracy_m: p.accuracyM,
              recorded_at: p.recordedAt,
            })),
          }),
        })
        if (res.ok) {
          const ids = unsynced.map((p) => p.id!).filter(Boolean)
          await db.gpsPoints.where('id').anyOf(ids).modify({ synced: true })
        }
      }
    } catch {
      // Offline — data remains in IndexedDB for later sync
    }

    // Finalize trip
    await db.trips.update(tripId, {
      endedAt: new Date().toISOString(),
      distanceM: Math.round(totalDistanceRef.current),
    })
  }, [])

  return { start, stop, error }
}
