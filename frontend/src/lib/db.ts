import Dexie, { type EntityTable } from 'dexie'

export interface DbTrip {
  id: string
  startedAt: string
  endedAt?: string
  distanceM: number
  destinationLat?: number
  destinationLng?: number
}

export interface DbGpsPoint {
  id?: number
  tripId: string
  lat: number
  lng: number
  speedKmh: number
  accuracyM: number
  recordedAt: string
  synced: boolean
}

export interface DbIntersectionResult {
  id?: number
  tripId: string
  index: number
  lat: number
  lng: number
  numRoads: number
  stopped: boolean
  minSpeedKmh: number | null
}

export interface DbRoute {
  tripId: string
  geometry: number[][]  // [[緯度, 経度], ...]
  distanceM: number
  durationS: number
}

const db = new Dexie('BlueTicketDriving') as Dexie & {
  trips: EntityTable<DbTrip, 'id'>
  gpsPoints: EntityTable<DbGpsPoint, 'id'>
  intersectionResults: EntityTable<DbIntersectionResult, 'id'>
  routes: EntityTable<DbRoute, 'tripId'>
}

db.version(2).stores({
  trips: 'id, startedAt',
  gpsPoints: '++id, tripId, synced, recordedAt',
  intersectionResults: '++id, tripId, index, [tripId+index]',
  routes: 'tripId',
})

export { db }
