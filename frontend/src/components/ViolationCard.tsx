import { AlertTriangle, Octagon } from 'lucide-react'
import type { DbViolation } from '../lib/db'
import { violationTypeLabel, formatDate } from '../lib/mockData'

export function ViolationCard({ violation }: { violation: DbViolation }) {
  const isSignal = violation.type === 'signal_ignore'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isSignal ? 'bg-red-50' : 'bg-amber-50'}`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isSignal ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
        }`}
      >
        {isSignal ? <AlertTriangle size={20} /> : <Octagon size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{violationTypeLabel(violation.type)}</p>
        <p className="text-xs text-gray-500">{formatDate(violation.detectedAt)}</p>
      </div>
    </div>
  )
}
