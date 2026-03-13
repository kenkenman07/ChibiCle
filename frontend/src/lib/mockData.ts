// Utility functions used across the app.
// DB types are in ./db.ts — these are formatting helpers only.

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return '1分未満'
  return `${minutes}分`
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${meters} m`
}

export function violationTypeLabel(
  type: 'signal_ignore' | 'no_stop',
): string {
  switch (type) {
    case 'signal_ignore':
      return '信号無視'
    case 'no_stop':
      return '一時不停止'
  }
}
