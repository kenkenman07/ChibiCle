import { useState, useRef, useCallback, useEffect } from 'react'

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const shouldBeActiveRef = useRef(false)

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      sentinelRef.current = await navigator.wakeLock.request('screen')
      shouldBeActiveRef.current = true
      setIsActive(true)

      sentinelRef.current.addEventListener('release', () => {
        setIsActive(false)
        sentinelRef.current = null
      })
    } catch {
      // Low battery or other OS restriction
    }
  }, [])

  const release = useCallback(async () => {
    shouldBeActiveRef.current = false
    if (sentinelRef.current) {
      await sentinelRef.current.release()
      sentinelRef.current = null
      setIsActive(false)
    }
  }, [])

  // Re-acquire on tab visibility change
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (
        document.visibilityState === 'visible' &&
        shouldBeActiveRef.current &&
        !sentinelRef.current
      ) {
        try {
          sentinelRef.current = await navigator.wakeLock.request('screen')
          setIsActive(true)
        } catch {
          // ignore
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldBeActiveRef.current = false
      sentinelRef.current?.release()
    }
  }, [])

  const isSupported = 'wakeLock' in navigator

  return { isActive, isSupported, request, release }
}
