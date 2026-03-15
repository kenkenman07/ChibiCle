import { useRef, useState } from "react"
import type { GpsPoint } from "../modules/gps/gps.types"

export const useGps = () => {
    const [gps, setGps] = useState<GpsPoint | null>(null)
    const [gpsError, setGpsError] = useState<string | null>(null)
    const watchId = useRef<number | null>(null)

    const getCurrentGpsOnce = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
                    accuracy_m: pos.coords.accuracy,
                    recorded_at: new Date(pos.timestamp).toISOString()
                })
            },
            (err) => setGpsError(err.message),
            {
                enableHighAccuracy: true,
            }
        )
    }

    const startTracking = () => {
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                setGps({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
                    accuracy_m: pos.coords.accuracy,
                    recorded_at: new Date(pos.timestamp).toISOString()
                })
            },
            (err) => setGpsError(err.message),
            {
                enableHighAccuracy: true,
            }
        )
    }

    const stopTracking = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current)
            watchId.current = null
        }
    }

    return {
        gps,
        gpsError,
        getCurrentGpsOnce,
        startTracking,
        stopTracking,
    }
}



