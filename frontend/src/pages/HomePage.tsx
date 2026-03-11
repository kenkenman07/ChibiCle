import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bike, ChevronRight } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, formatDuration, formatDistance } from '../lib/mockData'

export function HomePage() {
  const navigate = useNavigate()

  const tripsWithCounts = useLiveQuery(async () => {
    const allTrips = await db.trips.orderBy('startedAt').reverse().toArray()
    return Promise.all(
      allTrips.map(async (t) => ({
        ...t,
        violationCount: await db.violations.where('tripId').equals(t.id).count(),
      })),
    )
  })

  const trips = tripsWithCounts ?? []
  const recentTrips = trips.slice(0, 3)
  const monthlyRides = trips.length
  const monthlyViolations = trips.reduce((sum, t) => sum + t.violationCount, 0)

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-gray-900">こんにちは</h1>
      <p className="text-sm text-gray-500 mb-6">安全な走行を心がけましょう</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">走行回数</p>
          <p className="text-2xl font-bold text-gray-900">
            {monthlyRides}
            <span className="text-sm font-normal text-gray-500"> 回</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">違反件数</p>
          <p className={`text-2xl font-bold ${monthlyViolations > 0 ? 'text-danger' : 'text-success'}`}>
            {monthlyViolations}
            <span className="text-sm font-normal text-gray-500"> 件</span>
          </p>
        </div>
      </div>

      {/* Start Ride Button */}
      <button
        onClick={() => navigate('/riding')}
        className="w-full bg-primary active:bg-primary-dark text-white rounded-2xl p-6 flex items-center justify-center gap-3 shadow-lg shadow-blue-200 transition mb-6"
      >
        <Bike size={28} />
        <span className="text-xl font-bold">走行開始</span>
      </button>

      {/* Recent Rides */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">最近の走行</h2>

        {recentTrips.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-gray-400 text-sm">まだ走行記録がありません</p>
            <p className="text-gray-400 text-xs mt-1">「走行開始」を押して最初の走行を記録しましょう</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => navigate(`/result/${trip.id}`)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm active:bg-gray-50 transition text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(trip.startedAt)}</p>
                  <p className="text-xs text-gray-500">
                    {trip.endedAt ? formatDuration(trip.startedAt, trip.endedAt) : '走行中'} /{' '}
                    {formatDistance(trip.distanceM)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {trip.violationCount > 0 ? (
                    <span className="bg-red-100 text-danger text-xs font-bold px-2 py-1 rounded-full">
                      違反 {trip.violationCount}
                    </span>
                  ) : (
                    <span className="bg-green-100 text-success text-xs font-bold px-2 py-1 rounded-full">
                      安全
                    </span>
                  )}
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
