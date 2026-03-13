import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import { icon } from 'leaflet'
import { MapPin, Square, AlertTriangle, Navigation, Search, Loader2, CheckCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useRideStore, type RouteData } from '../stores/rideStore'
import { useGpsTracker } from '../hooks/useGpsTracker'
import { useWakeLock } from '../hooks/useWakeLock'
import { db } from '../lib/db'
import { apiFetch, searchAddress } from '../lib/api'
import 'leaflet/dist/leaflet.css'

const destinationIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const defaultIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const intersectionStoppedIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
})

const intersectionPendingIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
})

/** 地図クリックで目的地を選択するコンポーネント */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function RidingPage() {
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ストアの状態
  const isRiding = useRideStore((s) => s.isRiding)
  const tripId = useRideStore((s) => s.tripId)
  const currentSpeed = useRideStore((s) => s.currentSpeed)
  const currentAccuracy = useRideStore((s) => s.currentAccuracy)
  const currentLat = useRideStore((s) => s.currentLat)
  const currentLng = useRideStore((s) => s.currentLng)
  const elapsedSeconds = useRideStore((s) => s.elapsedSeconds)
  const destinationLat = useRideStore((s) => s.destinationLat)
  const destinationLng = useRideStore((s) => s.destinationLng)
  const destinationName = useRideStore((s) => s.destinationName)
  const route = useRideStore((s) => s.route)
  const totalIntersections = useRideStore((s) => s.totalIntersections)
  const stoppedIntersections = useRideStore((s) => s.stoppedIntersections)
  const startRide = useRideStore((s) => s.startRide)
  const endRide = useRideStore((s) => s.endRide)
  const setDestination = useRideStore((s) => s.setDestination)

  const gps = useGpsTracker()
  const wakeLock = useWakeLock()

  // フェーズ状態: 'setup'(設定) | 'confirm'(確認) | 'riding'(走行中)
  const [phase, setPhase] = useState<'setup' | 'confirm' | 'riding'>('setup')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // マウント時に現在地を取得
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        // フォールバック: 東京
        setMyLocation({ lat: 35.6812, lng: 139.7671 })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  // デバウンス付き住所検索
  const handleSearch = useCallback(async (query: string) => {
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
    }, 500)
  }, [])

  const handleSelectSearchResult = useCallback(
    (result: { lat: number; lng: number; display_name: string }) => {
      setDestination(result.lat, result.lng, result.display_name)
      setSearchResults([])
      setSearchQuery('')
    },
    [setDestination],
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setDestination(lat, lng, null)
    },
    [setDestination],
  )

  // バックエンド経由でOSRMルートを取得
  const handleFetchRoute = useCallback(async () => {
    if (!myLocation || destinationLat == null || destinationLng == null) return
    setIsLoadingRoute(true)
    setRouteError(null)

    try {
      // 目的地付きトリップを作成
      const tripIdNew = crypto.randomUUID()

      await db.trips.add({
        id: tripIdNew,
        startedAt: new Date().toISOString(),
        distanceM: 0,
        destinationLat,
        destinationLng,
      })

      const tripRes = await apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tripIdNew,
          destination_lat: destinationLat,
          destination_lng: destinationLng,
        }),
      })

      if (!tripRes.ok) throw new Error('Trip creation failed')

      // ルート計画
      const routeRes = await apiFetch(
        `/api/trips/${tripIdNew}/route?origin_lat=${myLocation.lat}&origin_lng=${myLocation.lng}`,
        { method: 'POST' },
      )

      if (!routeRes.ok) throw new Error('Route planning failed')

      const tripData = await routeRes.json()
      const routeData: RouteData = tripData.route

      // ルートをIndexedDBに保存
      await db.routes.put({
        tripId: tripIdNew,
        geometry: routeData.geometry,
        distanceM: routeData.distance_m,
        durationS: routeData.duration_s,
      })

      // 交差点結果をIndexedDBに保存
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

      // 走行フェーズ用にtripId・ルート・目的地をストアに保存。
      // ここではstartRideを呼ばない（isRiding=trueになるため）。
      // 走行はユーザーが「走行開始」を押した時に開始する。
      useRideStore.setState({
        tripId: tripIdNew,
        route: routeData,
        destinationLat,
        destinationLng,
        destinationName,
        totalIntersections: routeData.intersections.length,
        stoppedIntersections: 0,
      })
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : 'ルート取得に失敗しました')
    } finally {
      setIsLoadingRoute(false)
    }
  }, [myLocation, destinationLat, destinationLng, destinationName])

  // 走行を開始
  const handleStartRiding = useCallback(() => {
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

  const handleEnd = useCallback(async () => {
    if (!tripId) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    await gps.stop(tripId)
    await wakeLock.release()

    try {
      await apiFetch(`/api/trips/${tripId}/end`, { method: 'PATCH' })
    } catch {
      // バックエンドがオフラインの可能性
    }

    const currentTripId = tripId
    endRide()
    navigate(`/result/${currentTripId}`)
  }, [tripId, gps, wakeLock, endRide, navigate])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ===== フェーズ1: 目的地設定 =====
  if (phase === 'setup') {
    const mapCenter: [number, number] = destinationLat != null && destinationLng != null
      ? [destinationLat, destinationLng]
      : myLocation
        ? [myLocation.lat, myLocation.lng]
        : [35.6812, 139.7671]

    return (
      <div className="h-full bg-surface flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white/90 backdrop-blur-md px-5 py-3.5 border-b border-navy/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 -ml-1">
              <ArrowLeft size={20} className="text-navy/50" />
            </button>
            <div>
              <h1 className="text-base font-serif font-bold text-navy">目的地を設定</h1>
              <p className="text-[11px] text-navy/35">住所検索または地図をタップ</p>
            </div>
          </div>
        </div>

        {/* 検索バー */}
        <div className="bg-white/90 backdrop-blur-md px-5 py-3 border-b border-navy/[0.06]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/25" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="住所を検索..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-lg text-sm border border-navy/[0.08] focus:outline-none focus:border-primary/40 transition"
            />
            {isSearching && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-navy/30" />
            )}
          </div>

          {/* 検索結果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-navy/10 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectSearchResult(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface border-b border-navy/[0.04] last:border-0 text-navy/80"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 地図 */}
        <div className="flex-1 relative">
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={defaultIcon}>
                <Popup>現在地</Popup>
              </Marker>
            )}
            {destinationLat != null && destinationLng != null && (
              <Marker position={[destinationLat, destinationLng]} icon={destinationIcon}>
                <Popup>{destinationName ?? '目的地'}</Popup>
              </Marker>
            )}
            {route && (
              <Polyline
                positions={route.geometry.map((c) => [c[0], c[1]] as [number, number])}
                color="#1a56db"
                weight={4}
              />
            )}
            {route?.intersections.map((ix) => (
              <Marker key={ix.index} position={[ix.lat, ix.lng]} icon={intersectionPendingIcon}>
                <Popup>交差点 #{ix.index + 1} ({ix.num_roads}差路)</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* ボトムパネル */}
        <div className="bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 border-t border-navy/[0.06] safe-area-bottom">
          {destinationLat != null && destinationLng != null && (
            <div className="mb-3 flex items-center gap-2 text-sm text-navy/70">
              <Navigation size={13} className="text-primary flex-shrink-0" />
              <span className="truncate">{destinationName ?? `${destinationLat.toFixed(4)}, ${destinationLng.toFixed(4)}`}</span>
            </div>
          )}

          {routeError && (
            <div className="mb-3 bg-danger/5 border border-danger/20 text-danger text-xs rounded-lg px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={13} />
              {routeError}
            </div>
          )}

          {route && (
            <div className="mb-3 flex gap-2">
              <div className="flex-1 bg-surface rounded-lg py-2 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">DIST</p>
                <p className="font-mono font-bold text-navy text-sm">{(route.distance_m / 1000).toFixed(1)} km</p>
              </div>
              <div className="flex-1 bg-surface rounded-lg py-2 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">TIME</p>
                <p className="font-mono font-bold text-navy text-sm">{Math.round(route.duration_s / 60)}分</p>
              </div>
              <div className="flex-1 bg-accent/10 border border-accent/20 rounded-lg py-2 text-center">
                <p className="text-[10px] text-accent-dark font-grotesk tracking-wider">STOPS</p>
                <p className="font-mono font-bold text-accent-dark text-sm">{route.intersections.length}</p>
              </div>
            </div>
          )}

          {!route ? (
            <button
              onClick={handleFetchRoute}
              disabled={destinationLat == null || isLoadingRoute || !myLocation}
              className="w-full bg-navy text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-navy-light disabled:opacity-40 font-grotesk tracking-wide"
            >
              {isLoadingRoute ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  ルート取得中...
                </>
              ) : (
                <>
                  <Navigation size={17} />
                  ルートを取得
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setPhase('confirm')}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-primary-dark"
            >
              <ShieldCheck size={17} />
              おうちの人と確認する
            </button>
          )}
        </div>
      </div>
    )
  }

  // ===== フェーズ2: 保護者確認 =====
  if (phase === 'confirm' && route) {
    return (
      <div className="h-full bg-surface flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white/90 backdrop-blur-md px-5 py-4 border-b border-navy/[0.06]">
          <h1 className="text-lg font-serif font-bold text-navy">
            おうちの人と確認しよう
          </h1>
          <p className="text-xs text-navy/35 mt-0.5">走り出すまえに、いっしょにチェックしてね</p>
        </div>

        {/* 確認内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* ルートサマリー */}
          <div className="bg-white border border-navy/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Navigation size={14} className="text-primary" />
              <span className="text-sm font-semibold text-navy truncate">
                {destinationName ?? `${destinationLat!.toFixed(4)}, ${destinationLng!.toFixed(4)}`}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-surface rounded-lg py-2.5 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk">DISTANCE</p>
                <p className="font-mono font-bold text-navy">{(route.distance_m / 1000).toFixed(1)} km</p>
              </div>
              <div className="flex-1 bg-surface rounded-lg py-2.5 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk">TIME</p>
                <p className="font-mono font-bold text-navy">約{Math.round(route.duration_s / 60)}分</p>
              </div>
            </div>
          </div>

          {/* 交差点数ハイライト */}
          <div className="bg-accent/[0.08] border-2 border-accent/25 rounded-xl p-6 text-center">
            <p className="text-accent-dark text-sm font-serif font-semibold mb-2">この道には</p>
            <p className="text-6xl font-mono font-black text-accent leading-none my-3">
              {route.intersections.length}
            </p>
            <p className="text-accent-dark text-sm font-serif font-semibold">つの交差点があるよ</p>
            <p className="text-accent-dark/60 text-xs mt-3">ぜんぶの交差点でいちどとまろうね！</p>
          </div>

          {/* 保護者チェックリスト */}
          <div className="border-l-[3px] border-primary pl-4 py-1">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck size={16} className="text-primary" />
              <p className="text-sm font-serif font-bold text-navy">保護者の方へ</p>
            </div>
            <ul className="space-y-2 text-sm text-navy/65">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">01</span>
                <span>経路上に <b className="text-navy">{route.intersections.length}箇所</b> の交差点があります</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">02</span>
                <span>すべての交差点で一時停止するようお子さまに声かけをお願いします</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">03</span>
                <span>走行中はスマートフォンをさわらないよう伝えてください</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ボトムボタン */}
        <div className="bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 border-t border-navy/[0.06] safe-area-bottom space-y-2">
          <button
            onClick={handleStartRiding}
            className="w-full bg-success text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-success-dark"
          >
            <CheckCircle size={17} />
            かくにんできたら走行開始！
          </button>
          <button
            onClick={() => setPhase('setup')}
            className="w-full text-navy/35 text-sm py-2"
          >
            もどる
          </button>
        </div>
      </div>
    )
  }

  // ===== フェーズ3: 走行中 =====
  return (
    <div className="h-full bg-navy flex flex-col relative overflow-hidden">
      {/* 走行中の地図表示 */}
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={currentLat != null ? [currentLat, currentLng!] : [35.6812, 139.7671]}
          zoom={16}
          style={{ height: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {route && (
            <Polyline
              positions={route.geometry.map((c) => [c[0], c[1]] as [number, number])}
              color="#1a56db"
              weight={4}
              opacity={0.7}
            />
          )}
          {route?.intersections.map((ix) => (
            <Marker
              key={ix.index}
              position={[ix.lat, ix.lng]}
              icon={ix.stopped ? intersectionStoppedIcon : intersectionPendingIcon}
            >
              <Popup>
                交差点 #{ix.index + 1}
                {ix.stopped ? ' (停止済み)' : ''}
              </Popup>
            </Marker>
          ))}
          {currentLat != null && (
            <Marker position={[currentLat, currentLng!]} icon={defaultIcon}>
              <Popup>現在地</Popup>
            </Marker>
          )}
          {destinationLat != null && destinationLng != null && (
            <Marker position={[destinationLat, destinationLng]} icon={destinationIcon}>
              <Popup>目的地</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* タイマーオーバーレイ */}
        <div className="absolute top-4 right-4 bg-navy/60 backdrop-blur-sm rounded-lg px-3 py-1.5 z-[1000]">
          <span className="text-white text-sm font-mono font-medium">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Wake Lockバッジ */}
        {wakeLock.isActive && (
          <div className="absolute top-4 left-4 bg-accent/80 backdrop-blur-sm rounded-lg px-2.5 py-1 z-[1000]">
            <span className="text-white text-[10px] font-bold font-grotesk tracking-wide">SCREEN ON</span>
          </div>
        )}

        {/* GPSエラー */}
        {gps.error && (
          <div className="absolute top-14 inset-x-4 z-[1000]">
            <div className="bg-danger/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={13} />
              {gps.error}
            </div>
          </div>
        )}
      </div>

      {/* ボトムHUD */}
      <div className="bg-navy/90 backdrop-blur-md px-5 pt-4 pb-6 safe-area-bottom border-t border-white/[0.06]">
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">SPEED</p>
            <p className="text-white text-3xl font-mono font-bold leading-none">{currentSpeed.toFixed(1)}</p>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">km/h</p>
          </div>
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">GPS</p>
            <div className="flex items-center justify-center gap-1">
              <MapPin
                size={12}
                className={
                  currentLat == null
                    ? 'text-white/20'
                    : currentAccuracy < 10
                      ? 'text-green-400'
                      : 'text-accent'
                }
              />
              <p className="text-white text-3xl font-mono font-bold leading-none">
                {currentLat == null ? '--' : currentAccuracy.toFixed(0)}
              </p>
            </div>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">m</p>
          </div>
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">STOPS</p>
            <p className="text-white text-3xl font-mono font-bold leading-none">
              <span className="text-success">{stoppedIntersections}</span>
              <span className="text-white/25 text-lg mx-0.5">/</span>
              <span>{totalIntersections}</span>
            </p>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">箇所</p>
          </div>
        </div>

        <button
          onClick={handleEnd}
          disabled={!isRiding}
          className="w-full bg-danger active:bg-danger-dark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-40 font-grotesk tracking-wide"
        >
          <Square size={16} fill="currentColor" />
          走行終了
        </button>
      </div>
    </div>
  )
}
