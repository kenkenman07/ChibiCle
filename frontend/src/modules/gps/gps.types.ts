export type GpsPoint = {
    lat: number
    lng: number
    speed_kmh: number | null
    accuracy_m: number
    recorded_at: string
}

export type GpsRequest = {
    trip_id: string
    points: GpsPoint[]
}

export type GpsViolation = {
  type: string
  lat: number
  lng: number
  detected_at: string
}

export type GpsResponse = {
  saved: number
  violations: GpsViolation[]
}