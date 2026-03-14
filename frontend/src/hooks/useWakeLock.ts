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
      // バッテリー残量不足やOSの制限
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

  // タブ再表示時にWake Lockを再取得
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
          // 再取得失敗（無視）
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      shouldBeActiveRef.current = false
      sentinelRef.current?.release()
    }
  }, [])

  const isSupported = 'wakeLock' in navigator

  return { isActive, isSupported, request, release }
}
