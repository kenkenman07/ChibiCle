/**
 * トリップ履歴データの取得フック。
 * HomePage と HistoryPage で共通のDexieクエリを共有する。
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

export interface TripWithCounts {
  id: string
  startedAt: string
  endedAt?: string
  distanceM: number
  totalIntersections: number
  missedCount: number
}

export function useTripHistory() {
  const trips = useLiveQuery(async () => {
    const allTrips = await db.trips.orderBy('startedAt').reverse().toArray()
    return Promise.all(
      allTrips.map(async (t): Promise<TripWithCounts> => {
        const results = await db.intersectionResults.where('tripId').equals(t.id).toArray()
        const total = results.length
        const stopped = results.filter((r) => r.stopped).length
        return {
          id: t.id,
          startedAt: t.startedAt,
          endedAt: t.endedAt,
          distanceM: t.distanceM,
          totalIntersections: total,
          missedCount: total - stopped,
        }
      }),
    )
  })

  return trips ?? []
}
