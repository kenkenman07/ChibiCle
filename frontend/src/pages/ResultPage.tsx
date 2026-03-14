import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { icon } from 'leaflet'
import { ArrowLeft, Loader2, Home, CheckCircle, XCircle } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, formatDuration, formatDistance } from '../lib/mockData'
import 'leaflet/dist/leaflet.css'

const defaultIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const stoppedMarker = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const missedMarker = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export function ResultPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()

  const trip = useLiveQuery(() => (tripId ? db.trips.get(tripId) : undefined), [tripId])

  const gpsPoints = useLiveQuery(
    () =>
      tripId
        ? db.gpsPoints.where('tripId').equals(tripId).sortBy('recordedAt')
        : [],
    [tripId],
  )

  const intersectionResults = useLiveQuery(
    () =>
      tripId
        ? db.intersectionResults.where('tripId').equals(tripId).sortBy('index')
        : [],
    [tripId],
  )

  const routeData = useLiveQuery(
    () => (tripId ? db.routes.get(tripId) : undefined),
    [tripId],
  )

  // 読み込み中
  if (trip === undefined || gpsPoints === undefined || intersectionResults === undefined) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  // データなし
  if (!trip) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4">
        <p className="text-navy/40 mb-4">走行データが見つかりません</p>
        <button onClick={() => navigate('/')} className="text-primary font-semibold text-sm">
          ホームに戻る
        </button>
      </div>
    )
  }

  const gpsRoute = gpsPoints.map((p) => [p.lat, p.lng] as [number, number])
  const plannedRoute = routeData?.geometry.map((c) => [c[0], c[1]] as [number, number]) ?? []
  const hasRoute = gpsRoute.length >= 2 || plannedRoute.length >= 2

  const stoppedCount = intersectionResults?.filter((r) => r.stopped).length ?? 0
  const totalCount = intersectionResults?.length ?? 0
  const missedCount = totalCount - stoppedCount
  const allStopped = totalCount > 0 && missedCount === 0

  // GPSデータから地図の中心を計算
  const center: [number, number] = gpsRoute.length >= 2
    ? [
        gpsPoints.reduce((s, p) => s + p.lat, 0) / gpsPoints.length,
        gpsPoints.reduce((s, p) => s + p.lng, 0) / gpsPoints.length,
      ]
    : plannedRoute.length >= 2
      ? [
          plannedRoute.reduce((s, c) => s + c[0], 0) / plannedRoute.length,
          plannedRoute.reduce((s, c) => s + c[1], 0) / plannedRoute.length,
        ]
      : [35.6812, 139.7671]

  return (
    <div className="min-h-full bg-surface">
      {/* ヘッダー */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 flex items-center gap-3 px-5 py-3.5 border-b border-navy/[0.06]">
        <button onClick={() => navigate('/')} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-navy/50" />
        </button>
        <div>
          <h1 className="text-base font-serif font-bold text-navy">走行結果</h1>
          <p className="text-[11px] text-navy/35 font-grotesk">{formatDate(trip.startedAt)}</p>
        </div>
        <div className="ml-auto">
          {allStopped ? (
            <span className="flex items-center gap-1 bg-success/10 text-success text-xs font-bold px-2.5 py-1 rounded-lg">
              <CheckCircle size={12} />
              全停止
            </span>
          ) : missedCount > 0 ? (
            <span className="flex items-center gap-1 bg-danger/10 text-danger text-xs font-bold font-mono px-2.5 py-1 rounded-lg">
              <XCircle size={12} />
              {missedCount}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-5 max-w-lg mx-auto">
        {/* サマリー */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-white border border-navy/[0.06] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">TIME</p>
            <p className="text-lg font-mono font-bold text-navy mt-0.5">
              {trip.endedAt ? formatDuration(trip.startedAt, trip.endedAt) : '--'}
            </p>
          </div>
          <div className="flex-1 bg-white border border-navy/[0.06] rounded-xl p-3.5 text-center">
            <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">DIST</p>
            <p className="text-lg font-mono font-bold text-navy mt-0.5">{formatDistance(trip.distanceM)}</p>
          </div>
          <div className={`flex-1 border rounded-xl p-3.5 text-center ${
            allStopped
              ? 'bg-success/5 border-success/20'
              : missedCount > 0
                ? 'bg-danger/5 border-danger/20'
                : 'bg-white border-navy/[0.06]'
          }`}>
            <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">STOPS</p>
            <p className={`text-lg font-mono font-bold mt-0.5 ${allStopped ? 'text-success' : missedCount > 0 ? 'text-danger' : 'text-navy'}`}>
              {stoppedCount}/{totalCount}
            </p>
          </div>
        </div>

        {/* 地図 */}
        {hasRoute && (
          <div className="rounded-xl overflow-hidden border border-navy/[0.06] mb-5">
            <MapContainer center={center} zoom={15} style={{ height: 280 }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {plannedRoute.length >= 2 && (
                <Polyline positions={plannedRoute} color="#93c5fd" weight={6} opacity={0.5} />
              )}
              {gpsRoute.length >= 2 && (
                <Polyline positions={gpsRoute} color="#1a56db" weight={4} />
              )}
              {intersectionResults?.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat, r.lng]}
                  icon={r.stopped ? stoppedMarker : missedMarker}
                >
                  <Popup>
                    交差点 #{r.index + 1} ({r.numRoads}差路)
                    <br />
                    {r.stopped ? '一時停止済み' : '未停止'}
                    {r.minSpeedKmh != null && (
                      <>
                        <br />
                        最低速度: {r.minSpeedKmh.toFixed(1)} km/h
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}
              {gpsRoute.length >= 2 && (
                <>
                  <Marker position={gpsRoute[0]} icon={defaultIcon}>
                    <Popup>出発地点</Popup>
                  </Marker>
                  <Marker position={gpsRoute[gpsRoute.length - 1]} icon={defaultIcon}>
                    <Popup>到着地点</Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>
        )}

        {!hasRoute && (
          <div className="border-2 border-dashed border-navy/10 rounded-xl p-8 text-center mb-5">
            <p className="text-sm text-navy/30">GPSデータがありません</p>
          </div>
        )}

        {/* 交差点結果リスト */}
        {totalCount > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-serif font-semibold text-navy/60 mb-3">交差点チェック</h2>
            <div className="space-y-1.5">
              {intersectionResults?.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white border rounded-lg px-3.5 py-3 flex items-center gap-3 ${
                    r.stopped ? 'border-success/20' : 'border-danger/20'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    r.stopped ? 'bg-success/10' : 'bg-danger/10'
                  }`}>
                    {r.stopped ? (
                      <CheckCircle size={14} className="text-success" />
                    ) : (
                      <XCircle size={14} className="text-danger" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">
                      交差点 #{r.index + 1}
                      <span className="text-navy/30 font-normal text-xs ml-1.5">({r.numRoads}差路)</span>
                    </p>
                    <p className="text-xs text-navy/40 mt-0.5 font-grotesk">
                      {r.stopped ? 'STOPPED' : 'MISSED'}
                      {r.minSpeedKmh != null && ` — ${r.minSpeedKmh.toFixed(1)} km/h`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 成功/失敗サマリー */}
        {allStopped && totalCount > 0 ? (
          <div className="text-center py-6 mb-2">
            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-success" />
            </div>
            <p className="text-navy font-serif font-bold text-lg">全交差点で一時停止できました</p>
            <p className="text-sm text-navy/40 mt-1">安全な走行ができました</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-6 mb-2">
            <p className="text-navy/30 text-sm">交差点データがありません</p>
          </div>
        ) : null}

        {/* ホームに戻る */}
        <button
          onClick={() => navigate('/')}
          className="w-full mb-4 bg-navy text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:bg-navy-light font-grotesk tracking-wide"
        >
          <Home size={16} />
          ホームに戻る
        </button>
      </div>
    </div>
  )
}
