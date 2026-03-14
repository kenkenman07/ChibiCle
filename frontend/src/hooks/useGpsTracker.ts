/**
 * GPS制御フック — watchPosition のライフサイクル管理と速度計算のみ。
 *
 * データの永続化(Dexie)、Backend同期(API)、Zustand更新は
 * gpsSyncService に委譲する。
 */

import { useRef, useCallback, useState } from 'react'
import { haversineDistance } from '../lib/geo'
import { useRideStore } from '../stores/rideStore'
import { saveGpsPoint, syncUnsentPoints, finalizeTrip } from '../lib/gpsSyncService'

const SYNC_INTERVAL_MS = 5000

export function useGpsTracker() {
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const prevPointRef = useRef<{ lat: number; lng: number; time: number } | null>(null)
  const totalDistanceRef = useRef(0)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

        if (accuracy > 20) return

        // 速度計算: navigator.speed → haversine フォールバック
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

        // 距離累積
        if (prevPointRef.current) {
          totalDistanceRef.current += haversineDistance(
            prevPointRef.current.lat,
            prevPointRef.current.lng,
            latitude,
            longitude,
          )
        }
        prevPointRef.current = { lat: latitude, lng: longitude, time: now }

        // Zustand → UI反映
        useRideStore.getState().updateGps(latitude, longitude, speedKmh, accuracy)

        // IndexedDBに保存（gpsSyncService に委譲）
        saveGpsPoint(tripId, latitude, longitude, speedKmh, accuracy, pos.timestamp)
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

    // バックエンドへのバッチ同期を開始（gpsSyncService に委譲）
    syncIntervalRef.current = setInterval(() => {
      syncUnsentPoints(tripId).catch(() => {
        // ネットワークエラー — 次回の同期間隔でリトライ
      })
    }, SYNC_INTERVAL_MS)
  }, [])

  const stop = useCallback(async (tripId: string) => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    // 最終フラッシュ + トリップ終了（gpsSyncService に委譲）
    await finalizeTrip(tripId, totalDistanceRef.current)
  }, [])

  return { start, stop, error }
}
