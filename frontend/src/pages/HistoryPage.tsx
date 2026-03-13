import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db } from '../lib/db'
import { formatDate, formatDuration, formatDistance } from '../lib/mockData'

export function HistoryPage() {
  const navigate = useNavigate()

  const trips = useLiveQuery(async () => {
    const allTrips = await db.trips.orderBy('startedAt').reverse().toArray()
    return Promise.all(
      allTrips.map(async (t) => {
        const results = await db.intersectionResults.where('tripId').equals(t.id).toArray()
        const total = results.length
        const stopped = results.filter((r) => r.stopped).length
        return { ...t, totalIntersections: total, missedCount: total - stopped }
      }),
    )
  })

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <p className="text-sm text-navy/40 font-grotesk tracking-wide">HISTORY</p>
      <h1 className="text-2xl font-serif font-bold text-navy mt-1 mb-6">走行履歴</h1>

      {!trips || trips.length === 0 ? (
        <div className="border-2 border-dashed border-navy/10 rounded-xl p-10 text-center">
          <p className="text-navy/30 text-sm">まだ走行記録がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigate(`/result/${trip.id}`)}
              className="w-full bg-white border border-navy/[0.06] rounded-xl px-4 py-3.5 flex items-center justify-between active:bg-navy/[0.02] transition text-left"
            >
              <div>
                <p className="text-sm font-semibold text-navy">{formatDate(trip.startedAt)}</p>
                <p className="text-xs text-navy/40 mt-0.5 font-grotesk">
                  {trip.endedAt ? formatDuration(trip.startedAt, trip.endedAt) : '走行中'}
                  <span className="mx-1.5 text-navy/15">|</span>
                  {formatDistance(trip.distanceM)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {trip.missedCount > 0 ? (
                  <span className="bg-danger/10 text-danger text-xs font-bold font-mono px-2.5 py-1 rounded-lg">
                    {trip.missedCount}
                  </span>
                ) : trip.totalIntersections > 0 ? (
                  <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-1 rounded-lg">
                    全停止
                  </span>
                ) : null}
                <ChevronRight size={14} className="text-navy/20" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
