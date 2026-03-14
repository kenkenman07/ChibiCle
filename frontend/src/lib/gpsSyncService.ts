/**
 * GPS同期サービス — Backend APIとの通信、Dexie操作、Zustand更新を集約。
 *
 * useGpsTracker フックはGPS制御（watchPosition）のみに専念し、
 * データの永続化・同期・リルート処理はこのサービスに委譲する。
 */

import { db, type DbGpsPoint } from './db'
import { apiFetch } from './api'
import { useRideStore } from '../stores/rideStore'

/** Dexie の gpsPoints に格納する snake_case 変換 */
function toApiPoint(p: DbGpsPoint) {
  return {
    lat: p.lat,
    lng: p.lng,
    speed_kmh: p.speedKmh,
    accuracy_m: p.accuracyM,
    recorded_at: p.recordedAt,
  }
}

/** GPSポイントをIndexedDBに追加する。 */
export function saveGpsPoint(
  tripId: string,
  lat: number,
  lng: number,
  speedKmh: number,
  accuracyM: number,
  timestamp: number,
): void {
  db.gpsPoints.add({
    tripId,
    lat,
    lng,
    speedKmh,
    accuracyM,
    recordedAt: new Date(timestamp).toISOString(),
    synced: false,
  })
}

/** 未同期ポイントをBackendに送信し、レスポンスに応じてローカルDBを更新する。 */
export async function syncUnsentPoints(tripId: string): Promise<void> {
  const unsynced = await db.gpsPoints
    .where('tripId')
    .equals(tripId)
    .and((p) => !p.synced)
    .toArray()

  if (unsynced.length === 0) return

  const res = await apiFetch('/api/gps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trip_id: tripId,
      points: unsynced.map(toApiPoint),
    }),
  })

  if (!res.ok) return

  // 送信済みマーク
  const ids = unsynced.map((p) => p.id!).filter(Boolean)
  await db.gpsPoints.where('id').anyOf(ids).modify({ synced: true })

  const data = await res.json()

  if (data.rerouted) {
    await handleReroute(tripId)
  } else if (data.intersection_updates?.length > 0) {
    await applyIntersectionUpdates(tripId, data.intersection_updates)
  }
}

/** リルート発生時 — トリップ全体を再取得してローカルDBを置換する。 */
async function handleReroute(tripId: string): Promise<void> {
  const tripRes = await apiFetch(`/api/trips/${tripId}`)
  if (!tripRes.ok) return

  const tripData = await tripRes.json()
  if (!tripData.route) return

  useRideStore.getState().setRoute(tripData.route)

  await db.routes.put({
    tripId,
    geometry: tripData.route.geometry,
    distanceM: tripData.route.distance_m,
    durationS: tripData.route.duration_s,
  })

  await db.intersectionResults.where('tripId').equals(tripId).delete()
  for (const ix of tripData.route.intersections) {
    await db.intersectionResults.add({
      tripId,
      index: ix.index,
      lat: ix.lat,
      lng: ix.lng,
      numRoads: ix.num_roads,
      stopped: ix.stopped,
      minSpeedKmh: ix.min_speed_kmh,
    })
  }
}

/** 交差点結果の差分更新を適用する。 */
async function applyIntersectionUpdates(
  tripId: string,
  updates: Array<{ index: number; stopped: boolean; min_speed_kmh: number | null }>,
): Promise<void> {
  for (const update of updates) {
    await db.intersectionResults
      .where('[tripId+index]')
      .equals([tripId, update.index])
      .modify({
        stopped: update.stopped,
        minSpeedKmh: update.min_speed_kmh,
      })
  }

  const allResults = await db.intersectionResults
    .where('tripId')
    .equals(tripId)
    .toArray()
  const stopped = allResults.filter((r) => r.stopped).length
  useRideStore.getState().updateIntersections(allResults.length, stopped)
}

/** トリップ終了時の最終フラッシュ+ローカルDB更新。 */
export async function finalizeTrip(tripId: string, distanceM: number): Promise<void> {
  // 未同期ポイントの最終送信
  try {
    await syncUnsentPoints(tripId)
  } catch {
    // オフライン — データはIndexedDBに残り、後で同期
  }

  // トリップを終了
  await db.trips.update(tripId, {
    endedAt: new Date().toISOString(),
    distanceM: Math.round(distanceM),
  })
}
