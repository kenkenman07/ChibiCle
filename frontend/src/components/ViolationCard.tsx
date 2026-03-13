import { AlertTriangle, Octagon } from 'lucide-react'
import type { DbViolation } from '../lib/db'
import { violationTypeLabel, formatDate } from '../lib/mockData'

const styleMap = {
  signal_ignore: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', Icon: AlertTriangle },
  no_stop: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', Icon: Octagon },
} as const

export function ViolationCard({ violation }: { violation: DbViolation }) {
  const style = styleMap[violation.type] ?? styleMap.signal_ignore
  const { Icon } = style

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${style.bg}`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.icon}`}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{violationTypeLabel(violation.type)}</p>
        <p className="text-xs text-gray-500">{formatDate(violation.detectedAt)}</p>
      </div>
    </div>
  )
}
