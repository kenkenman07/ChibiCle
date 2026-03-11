import { useRef, useCallback, useState, type RefObject } from 'react'

interface CameraOptions {
  fps?: number
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

  const start = useCallback(async () => {
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

      // Create offscreen canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
        canvasRef.current.width = 640
        canvasRef.current.height = 480
      }

      // Start periodic frame capture
      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.drawImage(videoRef.current, 0, 0, 640, 480)
        canvasRef.current.toBlob(
          (blob) => {
            if (blob) latestBlobRef.current = blob
          },
          'image/jpeg',
          0.4,
        )
      }, 1000 / fps)
    } catch {
      setError('カメラの使用が許可されていません。ブラウザの設定を確認してください。')
    }
  }, [videoRef, fps])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
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

  /** Capture the current frame as a JPEG Blob */
  const captureFrame = useCallback((): Blob | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(videoRef.current, 0, 0, 640, 480)
    // Synchronous return of latest blob; for immediate use, read from ref
    return latestBlobRef.current
  }, [videoRef])

  return { start, stop, captureFrame, isStreaming, error }
}
