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
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  // データなし
  if (!trip) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">走行データが見つかりません</p>
        <button onClick={() => navigate('/')} className="text-primary font-semibold">
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
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">走行結果</h1>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{formatDate(trip.startedAt)}</p>
            {allStopped ? (
              <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                <CheckCircle size={12} />
                全交差点停止
              </span>
            ) : missedCount > 0 ? (
              <span className="flex items-center gap-1 bg-red-100 text-danger text-xs font-bold px-2 py-1 rounded-full">
                <XCircle size={12} />
                未停止 {missedCount} 箇所
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">走行時間</p>
              <p className="text-lg font-bold text-gray-900">
                {trip.endedAt ? formatDuration(trip.startedAt, trip.endedAt) : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">距離</p>
              <p className="text-lg font-bold text-gray-900">{formatDistance(trip.distanceM)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">一時停止</p>
              <p
                className={`text-lg font-bold ${allStopped ? 'text-success' : missedCount > 0 ? 'text-danger' : 'text-gray-900'}`}
              >
                {stoppedCount}/{totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* GPS stats */}
        {gpsPoints.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <p className="text-xs text-gray-500 mb-1">GPSポイント数</p>
            <p className="text-sm font-semibold text-gray-900">{gpsPoints.length} 点記録</p>
          </div>
        )}

        {/* Map */}
        {hasRoute && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
            <MapContainer center={center} zoom={15} style={{ height: 300 }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Planned route (light) */}
              {plannedRoute.length >= 2 && (
                <Polyline positions={plannedRoute} color="#93c5fd" weight={6} opacity={0.5} />
              )}
              {/* Actual GPS route */}
              {gpsRoute.length >= 2 && (
                <Polyline positions={gpsRoute} color="#2563eb" weight={4} />
              )}
              {/* Intersection markers — green=stopped, red=missed */}
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
              {/* Start/end markers */}
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
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 text-center">
            <p className="text-sm text-gray-400">GPSデータがありません</p>
          </div>
        )}

        {/* Intersection results list */}
        {totalCount > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">交差点一時停止チェック</h2>
            <div className="space-y-2">
              {intersectionResults?.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 ${
                    r.stopped ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    r.stopped ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {r.stopped ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      交差点 #{r.index + 1}
                      <span className="text-gray-400 font-normal ml-1">({r.numRoads}差路)</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.stopped ? '一時停止済み' : '未停止'}
                      {r.minSpeedKmh != null && ` — 最低速度 ${r.minSpeedKmh.toFixed(1)} km/h`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success/failure summary */}
        {allStopped && totalCount > 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-success font-bold">OK</span>
            </div>
            <p className="text-gray-900 font-bold">全交差点で一時停止できました</p>
            <p className="text-sm text-gray-500">安全な走行ができました</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">交差点データがありません</p>
          </div>
        ) : null}

        {/* Back to home */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 mb-4 bg-primary text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition active:bg-primary/80"
        >
          <Home size={18} />
          ホームに戻る
        </button>
      </div>
    </div>
  )
}
