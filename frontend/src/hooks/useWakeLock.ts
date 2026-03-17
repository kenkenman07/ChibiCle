import { useRef, useState } from "react"

export const useWakeLock = () => {
    const wakeLock = useRef<WakeLockSentinel | null>(null)
    const [wakeLockError, setWakeLockError] = useState<string | null>(null)
    const enableWakeLock = async () => {
        if (!("wakelock" in navigator)) {
            setWakeLockError("WakeLock is not supported")
            return
        }
        if (wakeLock.current !== null) return
        try {
            wakeLock.current = await navigator.wakeLock.request("screen")
        } catch (err) {
            if (err instanceof Error) {
                setWakeLockError(err.message)
            } else {
                setWakeLockError("WakeLock Unknown Error")
            }
        }
    }

    const disableWakeLock = async () => {
        if (wakeLock.current) {
            await wakeLock.current.release()
            wakeLock.current = null
        }
    }

    return {
        wakeLockError,
        enableWakeLock,
        disableWakeLock,
    }
}