import { useNavigate } from 'react-router-dom'
import { Bike, ChevronRight, Octagon } from 'lucide-react'
import { useTripHistory } from '../hooks/useTripHistory'
import { formatDate, formatDuration, formatDistance } from '../lib/mockData'

export function HomePage() {
  const navigate = useNavigate()
  const trips = useTripHistory()

  const recentTrips = trips.slice(0, 3)
  const monthlyRides = trips.length
  const totalMissed = trips.reduce((sum, t) => sum + t.missedCount, 0)

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      {/* 挨拶 */}
      <p className="text-sm text-navy/40 font-grotesk tracking-wide">DASHBOARD</p>
      <h1 className="text-2xl font-serif font-bold text-navy mt-1 mb-6">
        きょうも安全に走ろう
      </h1>

      {/* 走行開始ボタン */}
      <button
        onClick={() => navigate('/riding')}
        className="w-full bg-navy text-white rounded-2xl p-5 flex items-center gap-4 transition active:scale-[0.98] mb-6 group"
      >
        <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0 group-active:bg-accent/30 transition">
          <Bike size={24} className="text-accent" />
        </div>
        <div className="text-left flex-1">
          <span className="text-lg font-bold block">走行開始</span>
          <span className="text-white/40 text-xs">目的地を設定して出発</span>
        </div>
        <ChevronRight size={20} className="text-white/30" />
      </button>

      {/* 統計 */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 bg-white border border-navy/[0.06] rounded-xl p-4">
          <p className="text-[11px] text-navy/40 font-grotesk tracking-wider mb-1">RIDES</p>
          <p className="text-3xl font-mono font-bold text-navy">
            {monthlyRides}
          </p>
          <p className="text-xs text-navy/40 mt-0.5">回</p>
        </div>
        <div className="flex-1 bg-white border border-navy/[0.06] rounded-xl p-4">
          <p className="text-[11px] text-navy/40 font-grotesk tracking-wider mb-1">MISSED</p>
          <p className={`text-3xl font-mono font-bold ${totalMissed > 0 ? 'text-danger' : 'text-success'}`}>
            {totalMissed}
          </p>
          <p className="text-xs text-navy/40 mt-0.5">箇所の未停止</p>
        </div>
      </div>

      {/* 最近の走行 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-serif font-semibold text-navy/60">最近の走行</h2>
        {trips.length > 3 && (
          <button onClick={() => navigate('/history')} className="text-xs text-primary font-grotesk">
            すべて見る
          </button>
        )}
      </div>

      {recentTrips.length === 0 ? (
        <div className="border-2 border-dashed border-navy/10 rounded-xl p-8 text-center">
          <Octagon size={28} className="text-navy/15 mx-auto mb-2" />
          <p className="text-navy/30 text-sm">まだ走行記録がありません</p>
          <p className="text-navy/20 text-xs mt-1">「走行開始」で最初の記録を</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentTrips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => navigate(`/result/${trip.id}`)}
              className="w-full bg-white border border-navy/[0.06] rounded-xl px-4 py-3.5 flex items-center justify-between active:bg-navy/[0.02] transition text-left"
            >
              <div>
                <p className="text-sm font-semibold text-navy">{formatDate(trip.startedAt)}</p>
                <p className="text-xs text-navy/40 mt-0.5 font-grotesk">
                  {trip.endedAt ? formatDuration(trip.startedAt, trip.endedAt) : '走行中'}
                  <span className="mx-1.5 text-navy/15">|</span>
                  {formatDistance(trip.distanceM)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {trip.missedCount > 0 ? (
                  <span className="bg-danger/10 text-danger text-xs font-bold font-mono px-2.5 py-1 rounded-lg">
                    {trip.missedCount}
                  </span>
                ) : trip.totalIntersections > 0 ? (
                  <span className="bg-success/10 text-success text-xs font-bold px-2.5 py-1 rounded-lg">
                    全停止
                  </span>
                ) : null}
                <ChevronRight size={14} className="text-navy/20" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
