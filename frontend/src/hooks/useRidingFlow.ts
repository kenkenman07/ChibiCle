/**
 * 走行フロー全体のビジネスロジックを管理するフック。
 *
 * ページコンポーネントは描画と遷移のみに専念し、
 * API呼び出し・Dexie操作・GPS取得・タイマー管理はここに集約する。
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRideStore, type RouteData } from '../stores/rideStore'
import { useGpsTracker } from './useGpsTracker'
import { useWakeLock } from './useWakeLock'
import { db } from '../lib/db'
import { apiFetch, searchAddress } from '../lib/api'

export type RidingPhase = 'origin' | 'destination' | 'confirm' | 'riding'

export function useRidingFlow() {
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const gps = useGpsTracker()
  const wakeLock = useWakeLock()

  // ---- ローカルUI状態 ----
  const [phase, setPhase] = useState<RidingPhase>('origin')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(true)
  const [routeError, setRouteError] = useState<string | null>(null)

  // ---- Zustand ストア ----
  const isRiding = useRideStore((s) => s.isRiding)
  const tripId = useRideStore((s) => s.tripId)
  const currentSpeed = useRideStore((s) => s.currentSpeed)
  const currentAccuracy = useRideStore((s) => s.currentAccuracy)
  const currentLat = useRideStore((s) => s.currentLat)
  const currentLng = useRideStore((s) => s.currentLng)
  const elapsedSeconds = useRideStore((s) => s.elapsedSeconds)
  const originLat = useRideStore((s) => s.originLat)
  const originLng = useRideStore((s) => s.originLng)
  const originName = useRideStore((s) => s.originName)
  const destinationLat = useRideStore((s) => s.destinationLat)
  const destinationLng = useRideStore((s) => s.destinationLng)
  const destinationName = useRideStore((s) => s.destinationName)
  const route = useRideStore((s) => s.route)
  const totalIntersections = useRideStore((s) => s.totalIntersections)
  const stoppedIntersections = useRideStore((s) => s.stoppedIntersections)
  const setOrigin = useRideStore((s) => s.setOrigin)
  const setDestination = useRideStore((s) => s.setDestination)
  const startRide = useRideStore((s) => s.startRide)
  const endRide = useRideStore((s) => s.endRide)

  // ---- 初期GPS取得 ----
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(pos.coords.latitude, pos.coords.longitude, '現在地')
        setGpsLoading(false)
      },
      () => {
        setOrigin(35.6812, 139.7671, '東京')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [setOrigin])

  // ---- クリーンアップ ----
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // ---- アクション ----

  const relocate = useCallback(() => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(pos.coords.latitude, pos.coords.longitude, '現在地')
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [setOrigin])

  const search = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchAddress(query)
      setSearchResults(results)
      setIsSearching(false)
    }, 1000)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
  }, [])

  const updateDestination = useCallback(
    (lat: number, lng: number, name: string | null) => {
      setDestination(lat, lng, name)
      if (route) {
        useRideStore.setState({ route: null, tripId: null, totalIntersections: 0, stoppedIntersections: 0 })
        setRouteError(null)
      }
    },
    [setDestination, route],
  )

  const selectSearchResult = useCallback(
    (result: { lat: number; lng: number; display_name: string }) => {
      if (phase === 'origin') {
        setOrigin(result.lat, result.lng, result.display_name)
      } else {
        updateDestination(result.lat, result.lng, result.display_name)
      }
      setSearchResults([])
      setSearchQuery('')
    },
    [phase, setOrigin, updateDestination],
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (phase === 'origin') {
        setOrigin(lat, lng, null)
      } else {
        updateDestination(lat, lng, null)
      }
    },
    [phase, setOrigin, updateDestination],
  )

  const goToDestination = useCallback(() => {
    clearSearch()
    setPhase('destination')
  }, [clearSearch])

  const goBackToOrigin = useCallback(() => {
    clearSearch()
    setPhase('origin')
  }, [clearSearch])

  const goToConfirm = useCallback(() => {
    setPhase('confirm')
  }, [])

  const goBackToDestination = useCallback(() => {
    setPhase('destination')
  }, [])

  const fetchRoute = useCallback(async () => {
    if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) return
    setIsLoadingRoute(true)
    setRouteError(null)

    try {
      // Backend がIDを生成 → レスポンスから取得
      const tripRes = await apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_lat: destinationLat,
          destination_lng: destinationLng,
        }),
      })

      if (!tripRes.ok) {
        const errBody = await tripRes.json().catch(() => null)
        throw new Error(errBody?.detail ?? `トリップ作成に失敗 (HTTP ${tripRes.status})`)
      }

      const createdTrip = await tripRes.json()
      const tripIdNew: string = createdTrip.id

      await db.trips.add({
        id: tripIdNew,
        startedAt: createdTrip.started_at,
        distanceM: 0,
        destinationLat,
        destinationLng,
      })

      const routeRes = await apiFetch(`/api/trips/${tripIdNew}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_lat: originLat,
          origin_lng: originLng,
        }),
      })

      if (!routeRes.ok) {
        const errBody = await routeRes.json().catch(() => null)
        throw new Error(errBody?.detail ?? `ルート取得に失敗 (HTTP ${routeRes.status})`)
      }

      const tripData = await routeRes.json()
      const routeData: RouteData = tripData.route

      await db.routes.put({
        tripId: tripIdNew,
        geometry: routeData.geometry,
        distanceM: routeData.distance_m,
        durationS: routeData.duration_s,
      })

      for (const ix of routeData.intersections) {
        await db.intersectionResults.add({
          tripId: tripIdNew,
          index: ix.index,
          lat: ix.lat,
          lng: ix.lng,
          numRoads: ix.num_roads,
          stopped: false,
          minSpeedKmh: null,
        })
      }

      useRideStore.setState({
        tripId: tripIdNew,
        route: routeData,
        totalIntersections: routeData.intersections.length,
        stoppedIntersections: 0,
      })
    } catch (e) {
      if (e instanceof TypeError && (e.message === 'Failed to fetch' || e.message === 'NetworkError when attempting to fetch resource.')) {
        setRouteError('サーバーに接続できません。バックエンドが起動しているか確認してください。')
      } else {
        setRouteError(e instanceof Error ? e.message : 'ルート取得に失敗しました')
      }
    } finally {
      setIsLoadingRoute(false)
    }
  }, [originLat, originLng, destinationLat, destinationLng])

  const startRiding = useCallback(() => {
    const currentTripId = useRideStore.getState().tripId
    if (!currentTripId) return

    startRide(currentTripId)
    wakeLock.request()
    gps.start(currentTripId)

    timerRef.current = setInterval(() => {
      useRideStore.getState().tick()
    }, 1000)

    setPhase('riding')
  }, [startRide, gps, wakeLock])

  const endRiding = useCallback(async () => {
    if (!tripId) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    await gps.stop(tripId)
    await wakeLock.release()

    try {
      const tripRecord = await db.trips.get(tripId)
      await apiFetch(`/api/trips/${tripId}/end`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance_m: tripRecord?.distanceM ?? 0,
        }),
      })
    } catch {
      // バックエンドがオフラインの可能性
    }

    const currentTripId = tripId
    endRide()
    navigate(`/result/${currentTripId}`)
  }, [tripId, gps, wakeLock, endRide, navigate])

  // ---- 返却 ----
  return {
    // フェーズ
    phase,
    goToDestination,
    goBackToOrigin,
    goToConfirm,
    goBackToDestination,

    // 検索
    searchQuery,
    searchResults,
    isSearching,
    search,
    clearSearch,
    selectSearchResult,

    // GPS・地図
    gpsLoading,
    relocate,
    handleMapClick,
    gpsError: gps.error,

    // ルート
    isLoadingRoute,
    routeError,
    fetchRoute,

    // 走行
    startRiding,
    endRiding,
    wakeLockActive: wakeLock.isActive,

    // ストア値（描画用）
    isRiding,
    tripId,
    currentSpeed,
    currentAccuracy,
    currentLat,
    currentLng,
    elapsedSeconds,
    originLat,
    originLng,
    originName,
    destinationLat,
    destinationLng,
    destinationName,
    route,
    totalIntersections,
    stoppedIntersections,
  }
}
