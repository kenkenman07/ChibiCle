import { useRef, useCallback, useState, type RefObject } from 'react'
import { useRideStore } from '../stores/rideStore'
import { db } from '../lib/db'
import { apiWsUrl } from '../lib/api'

interface CameraOptions {
  fps?: number
  tripId?: string
}

export function useCameraStream(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: CameraOptions = {},
) {
  const { fps = 2 } = options
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestBlobRef = useRef<Blob | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const start = useCallback(async (tripId?: string) => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsStreaming(true)

      // Create offscreen canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
        canvasRef.current.width = 640
        canvasRef.current.height = 480
      }

      // Connect WebSocket for frame sending
      const effectiveTripId = tripId ?? options.tripId
      if (effectiveTripId) {
        const wsUrl = apiWsUrl(`/ws/camera?trip_id=${effectiveTripId}`)
        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }))
            } else if (data.type === 'violation' && data.data) {
              // Write violation to IndexedDB + update store
              db.violations.add({
                tripId: effectiveTripId,
                type: data.data.violation_type,
                detectedAt: data.data.detected_at,
                lat: data.data.lat,
                lng: data.data.lng,
              })
              useRideStore.getState().incrementViolations()
            }
          } catch {
            // ignore parse errors
          }
        }

        ws.onerror = () => {
          console.warn('Camera WebSocket error — frames will only be captured locally')
        }

        wsRef.current = ws
      }

      // Periodic frame capture + send
      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.drawImage(videoRef.current, 0, 0, 640, 480)
        canvasRef.current.toBlob(
          (blob) => {
            if (!blob) return
            latestBlobRef.current = blob

            // Send via WebSocket if connected
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              blob.arrayBuffer().then((buf) => {
                wsRef.current?.send(buf)
              })
            }
          },
          'image/jpeg',
          0.4,
        )
      }, 1000 / fps)
    } catch {
      setError('カメラの使用が許可されていません。ブラウザの設定を確認してください。')
    }
  }, [videoRef, fps, options.tripId])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    latestBlobRef.current = null
    setIsStreaming(false)
  }, [videoRef])

  const captureFrame = useCallback((): Blob | null => {
    return latestBlobRef.current
  }, [])

  return { start, stop, captureFrame, isStreaming, error }
}
