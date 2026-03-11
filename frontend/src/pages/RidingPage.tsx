import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Shield, Square, AlertTriangle } from 'lucide-react'
import { useRideStore } from '../stores/rideStore'
import { useGpsTracker } from '../hooks/useGpsTracker'
import { useCameraStream } from '../hooks/useCameraStream'
import { useWakeLock } from '../hooks/useWakeLock'
import { db } from '../lib/db'

export function RidingPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isRiding = useRideStore((s) => s.isRiding)
  const tripId = useRideStore((s) => s.tripId)
  const currentSpeed = useRideStore((s) => s.currentSpeed)
  const currentAccuracy = useRideStore((s) => s.currentAccuracy)
  const currentLat = useRideStore((s) => s.currentLat)
  const violationCount = useRideStore((s) => s.violationCount)
  const elapsedSeconds = useRideStore((s) => s.elapsedSeconds)
  const startRide = useRideStore((s) => s.startRide)
  const endRide = useRideStore((s) => s.endRide)
  const incrementViolations = useRideStore((s) => s.incrementViolations)

  const gps = useGpsTracker()
  const camera = useCameraStream(videoRef, { fps: 2 })
  const wakeLock = useWakeLock()

  const [showAlert, setShowAlert] = useState(false)
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start ride on mount
  useEffect(() => {
    const init = async () => {
      const id = crypto.randomUUID()

      // Store locally
      await db.trips.add({
        id,
        startedAt: new Date().toISOString(),
        distanceM: 0,
      })

      // Also create on backend (best-effort)
      try {
        await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
      } catch {
        // Backend may be offline — local-first is fine
      }

      startRide(id)
      wakeLock.request()
      gps.start(id)
      camera.start(id) // pass tripId for WebSocket connection

      timerRef.current = setInterval(() => {
        useRideStore.getState().tick()
      }, 1000)
    }

    init()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnd = useCallback(async () => {
    if (!tripId) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    await gps.stop(tripId)
    camera.stop()
    await wakeLock.release()

    // End trip on backend (best-effort)
    try {
      await fetch(`/api/trips/${tripId}/end`, { method: 'PATCH' })
    } catch {
      // Backend may be offline
    }

    const currentTripId = tripId
    endRide()
    navigate(`/result/${currentTripId}`)
  }, [tripId, gps, camera, wakeLock, endRide, navigate])

  // Simulate violation (debug: double-tap the violation counter)
  const handleSimulateViolation = useCallback(async () => {
    if (!tripId) return
    const state = useRideStore.getState()
    const lat = state.currentLat ?? 0
    const lng = state.currentLng ?? 0

    const types: Array<'signal_ignore' | 'no_stop'> = ['signal_ignore', 'no_stop']
    const type = types[Math.floor(Math.random() * types.length)]

    const frame = camera.captureFrame()

    await db.violations.add({
      tripId,
      type,
      detectedAt: new Date().toISOString(),
      lat,
      lng,
      photoBlob: frame ?? undefined,
    })

    incrementViolations()

    // Show alert
    setShowAlert(true)
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current)
    alertTimeoutRef.current = setTimeout(() => {
      setShowAlert(false)
    }, 3000)
  }, [tripId, camera, incrementViolations])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col relative overflow-hidden">
      {/* Live camera preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Fallback when camera not available */}
        {!camera.isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <Camera size={64} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm opacity-50">
                {camera.error ?? 'カメラを起動中...'}
              </p>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {camera.isStreaming && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-mono">REC</span>
          </div>
        )}

        {/* Timer */}
        <div className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1.5">
          <span className="text-white text-sm font-mono">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Wake Lock badge */}
        {wakeLock.isActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/80 rounded-full px-3 py-1">
            <span className="text-white text-[10px] font-bold">画面ON維持中</span>
          </div>
        )}

        {/* GPS error */}
        {gps.error && (
          <div className="absolute top-14 inset-x-4">
            <div className="bg-red-600/90 text-white text-xs rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={14} />
              {gps.error}
            </div>
          </div>
        )}

        {/* Violation alert overlay */}
        {showAlert && (
          <div className="absolute inset-x-0 top-1/3 flex justify-center z-10 animate-bounce">
            <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
              <Shield size={20} />
              <span className="font-bold">違反を検知しました</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="bg-black/70 backdrop-blur-sm px-4 pt-4 pb-6 safe-area-bottom">
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-xs">速度</p>
            <p className="text-white text-2xl font-bold font-mono">{currentSpeed.toFixed(1)}</p>
            <p className="text-gray-400 text-xs">km/h</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-xs">GPS精度</p>
            <div className="flex items-center justify-center gap-1">
              <MapPin
                size={14}
                className={
                  currentLat == null
                    ? 'text-gray-500'
                    : currentAccuracy < 10
                      ? 'text-green-400'
                      : 'text-yellow-400'
                }
              />
              <p className="text-white text-2xl font-bold font-mono">
                {currentLat == null ? '--' : currentAccuracy.toFixed(0)}
              </p>
            </div>
            <p className="text-gray-400 text-xs">m</p>
          </div>
          {/* Double-tap to simulate violation (debug) */}
          <div className="text-center" onDoubleClick={handleSimulateViolation}>
            <p className="text-gray-400 text-xs">違反</p>
            <p
              className={`text-2xl font-bold font-mono ${violationCount > 0 ? 'text-red-400' : 'text-white'}`}
            >
              {violationCount}
            </p>
            <p className="text-gray-400 text-xs">件</p>
          </div>
        </div>

        <button
          onClick={handleEnd}
          disabled={!isRiding}
          className="w-full bg-danger active:bg-danger-dark text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Square size={20} fill="currentColor" />
          走行終了
        </button>
      </div>
    </div>
  )
}
