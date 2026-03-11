import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { icon } from 'leaflet'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, formatDuration, formatDistance, violationTypeLabel } from '../lib/mockData'
import { ViolationCard } from '../components/ViolationCard'
import 'leaflet/dist/leaflet.css'

const defaultIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const violationMarker = icon({
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

  const violations = useLiveQuery(
    () =>
      tripId
        ? db.violations.where('tripId').equals(tripId).toArray()
        : [],
    [tripId],
  )

  // Loading
  if (trip === undefined || gpsPoints === undefined || violations === undefined) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  // Not found
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

  const route = gpsPoints.map((p) => [p.lat, p.lng] as [number, number])
  const hasRoute = route.length >= 2

  // Compute map center from GPS data
  const center: [number, number] = hasRoute
    ? [
        gpsPoints.reduce((s, p) => s + p.lat, 0) / gpsPoints.length,
        gpsPoints.reduce((s, p) => s + p.lng, 0) / gpsPoints.length,
      ]
    : [35.6812, 139.7671] // fallback: Tokyo

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">走行結果</h1>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{formatDate(trip.startedAt)}</p>
            {violations.length > 0 && (
              <span className="flex items-center gap-1 bg-red-100 text-danger text-xs font-bold px-2 py-1 rounded-full">
                <AlertTriangle size={12} />
                違反 {violations.length} 件
              </span>
            )}
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
              <p className="text-xs text-gray-500">違反</p>
              <p
                className={`text-lg font-bold ${violations.length > 0 ? 'text-danger' : 'text-success'}`}
              >
                {violations.length} 件
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
            <MapContainer center={center} zoom={15} style={{ height: 250 }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={route} color="#2563eb" weight={4} />
              {violations.map((v) => (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={violationMarker}>
                  <Popup>{violationTypeLabel(v.type)}</Popup>
                </Marker>
              ))}
              <Marker position={route[0]} icon={defaultIcon}>
                <Popup>出発地点</Popup>
              </Marker>
              <Marker position={route[route.length - 1]} icon={defaultIcon}>
                <Popup>到着地点</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {!hasRoute && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 text-center">
            <p className="text-sm text-gray-400">GPSデータがありません</p>
          </div>
        )}

        {/* Violations list */}
        {violations.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">検知された違反</h2>
            <div className="space-y-2">
              {violations.map((v) => (
                <ViolationCard key={v.id} violation={v} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-success font-bold">OK</span>
            </div>
            <p className="text-gray-900 font-bold">違反なし</p>
            <p className="text-sm text-gray-500">安全な走行ができました</p>
          </div>
        )}
      </div>
    </div>
  )
}
