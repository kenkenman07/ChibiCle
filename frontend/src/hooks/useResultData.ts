/**
 * 走行結果データの取得フック。
 * ResultPage で使用するDexieクエリを集約する。
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { DbTrip, DbGpsPoint, DbIntersectionResult, DbRoute } from '../lib/db'

export type ResultData =
  | { loading: true }
  | {
      loading: false
      trip: DbTrip | undefined
      gpsPoints: DbGpsPoint[]
      intersectionResults: DbIntersectionResult[]
      routeData: DbRoute | undefined
    }

export function useResultData(tripId: string | undefined): ResultData {
  const trip = useLiveQuery(
    () => (tripId ? db.trips.get(tripId) : undefined),
    [tripId],
  )

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

  if (trip === undefined || gpsPoints === undefined || intersectionResults === undefined) {
    return { loading: true }
  }

  return {
    loading: false,
    trip,
    gpsPoints: gpsPoints ?? [],
    intersectionResults: intersectionResults ?? [],
    routeData,
  }
}
