import Dexie, { type EntityTable } from 'dexie'

export interface DbTrip {
  id: string
  startedAt: string
  endedAt?: string
  distanceM: number
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

export interface DbViolation {
  id?: number
  tripId: string
  type: 'signal_ignore' | 'no_stop'
  detectedAt: string
  lat: number
  lng: number
  photoBlob?: Blob
}

const db = new Dexie('BlueTicketDriving') as Dexie & {
  trips: EntityTable<DbTrip, 'id'>
  gpsPoints: EntityTable<DbGpsPoint, 'id'>
  violations: EntityTable<DbViolation, 'id'>
}

db.version(1).stores({
  trips: 'id, startedAt',
  gpsPoints: '++id, tripId, synced, recordedAt',
  violations: '++id, tripId',
})

export { db }
