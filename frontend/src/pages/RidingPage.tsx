/**
 * 走行ページ — 描画と遷移のみ。
 * ビジネスロジックは useRidingFlow フックに集約。
 */

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet'
import { icon } from 'leaflet'
import { MapPin, Square, AlertTriangle, Navigation, Search, Loader2, CheckCircle, ShieldCheck, ArrowLeft, ArrowRight, LocateFixed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRidingFlow } from '../hooks/useRidingFlow'
import 'leaflet/dist/leaflet.css'

// ---- マーカーアイコン定義 ----
const destinationIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const originIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const defaultIcon = icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const intersectionStoppedIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
})

const intersectionPendingIcon = icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
})

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ---- 共通UIパーツ ----

function SearchBar({ query, onSearch, placeholder, isSearching, results, onSelect }: {
  query: string
  onSearch: (q: string) => void
  placeholder: string
  isSearching: boolean
  results: Array<{ lat: number; lng: number; display_name: string }>
  onSelect: (r: { lat: number; lng: number; display_name: string }) => void
}) {
  return (
    <div className="bg-white/90 backdrop-blur-md px-5 py-3 border-b border-navy/[0.06]">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/25" />
        <input
          type="text"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-lg text-sm border border-navy/[0.08] focus:outline-none focus:border-primary/40 transition"
        />
        {isSearching && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-navy/30" />
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-2 bg-white border border-navy/10 rounded-lg overflow-hidden shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onSelect(r)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface border-b border-navy/[0.04] last:border-0 text-navy/80"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- メインコンポーネント ----

export function RidingPage() {
  const navigate = useNavigate()
  const flow = useRidingFlow()

  // ===== フェーズ1: 出発地選択 =====
  if (flow.phase === 'origin') {
    const mapCenter: [number, number] = flow.originLat != null && flow.originLng != null
      ? [flow.originLat, flow.originLng]
      : [35.6812, 139.7671]

    return (
      <div className="h-full bg-surface flex flex-col">
        <div className="bg-white/90 backdrop-blur-md px-5 py-3.5 border-b border-navy/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 -ml-1">
              <ArrowLeft size={20} className="text-navy/50" />
            </button>
            <div className="flex-1">
              <p className="text-[10px] text-navy/35 font-grotesk tracking-widest">STEP 1 / 2</p>
              <h1 className="text-base font-serif font-bold text-navy">出発地を確認</h1>
            </div>
          </div>
        </div>

        <SearchBar
          query={flow.searchQuery}
          onSearch={flow.search}
          placeholder="出発地を検索..."
          isSearching={flow.isSearching}
          results={flow.searchResults}
          onSelect={flow.selectSearchResult}
        />

        <div className="flex-1 relative">
          {flow.gpsLoading ? (
            <div className="h-full flex items-center justify-center bg-surface">
              <div className="text-center">
                <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-navy/40">現在地を取得中...</p>
              </div>
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={16} style={{ height: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={flow.handleMapClick} />
              {flow.originLat != null && flow.originLng != null && (
                <Marker position={[flow.originLat, flow.originLng]} icon={originIcon}>
                  <Popup>{flow.originName ?? '出発地'}</Popup>
                </Marker>
              )}
            </MapContainer>
          )}
          {!flow.gpsLoading && (
            <button
              onClick={flow.relocate}
              className="absolute bottom-4 right-4 z-[1000] w-10 h-10 bg-white border border-navy/10 rounded-lg flex items-center justify-center shadow-md active:bg-surface transition"
            >
              <LocateFixed size={18} className="text-primary" />
            </button>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 border-t border-navy/[0.06] safe-area-bottom">
          {flow.originLat != null && flow.originLng != null && (
            <div className="mb-3 flex items-center gap-2 text-sm text-navy/70">
              <MapPin size={13} className="text-primary flex-shrink-0" />
              <span className="truncate">{flow.originName ?? `${flow.originLat.toFixed(4)}, ${flow.originLng.toFixed(4)}`}</span>
            </div>
          )}
          <button
            onClick={flow.goToDestination}
            disabled={flow.originLat == null || flow.gpsLoading}
            className="w-full bg-navy text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-navy-light disabled:opacity-40"
          >
            次へ：目的地を設定
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  // ===== フェーズ2: 目的地選択 =====
  if (flow.phase === 'destination') {
    const mapCenter: [number, number] = flow.destinationLat != null && flow.destinationLng != null
      ? [flow.destinationLat, flow.destinationLng]
      : flow.originLat != null && flow.originLng != null
        ? [flow.originLat, flow.originLng]
        : [35.6812, 139.7671]

    return (
      <div className="h-full bg-surface flex flex-col">
        <div className="bg-white/90 backdrop-blur-md px-5 py-3.5 border-b border-navy/[0.06]">
          <div className="flex items-center gap-3">
            <button onClick={flow.goBackToOrigin} className="p-1 -ml-1">
              <ArrowLeft size={20} className="text-navy/50" />
            </button>
            <div className="flex-1">
              <p className="text-[10px] text-navy/35 font-grotesk tracking-widest">STEP 2 / 2</p>
              <h1 className="text-base font-serif font-bold text-navy">目的地を設定</h1>
            </div>
          </div>
        </div>

        <SearchBar
          query={flow.searchQuery}
          onSearch={flow.search}
          placeholder="目的地を検索..."
          isSearching={flow.isSearching}
          results={flow.searchResults}
          onSelect={flow.selectSearchResult}
        />

        <div className="flex-1 relative">
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={flow.handleMapClick} />
            {flow.originLat != null && flow.originLng != null && (
              <Marker position={[flow.originLat, flow.originLng]} icon={originIcon}>
                <Popup>{flow.originName ?? '出発地'}</Popup>
              </Marker>
            )}
            {flow.destinationLat != null && flow.destinationLng != null && (
              <Marker position={[flow.destinationLat, flow.destinationLng]} icon={destinationIcon}>
                <Popup>{flow.destinationName ?? '目的地'}</Popup>
              </Marker>
            )}
            {flow.route && (
              <Polyline
                positions={flow.route.geometry.map((c) => [c[0], c[1]] as [number, number])}
                color="#1a56db"
                weight={4}
              />
            )}
            {flow.route?.intersections.map((ix) => (
              <Marker key={ix.index} position={[ix.lat, ix.lng]} icon={intersectionPendingIcon}>
                <Popup>交差点 #{ix.index + 1} ({ix.num_roads}差路)</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 border-t border-navy/[0.06] safe-area-bottom">
          {flow.destinationLat != null && flow.destinationLng != null && (
            <div className="mb-3 flex items-center gap-2 text-sm text-navy/70">
              <Navigation size={13} className="text-primary flex-shrink-0" />
              <span className="truncate">{flow.destinationName ?? `${flow.destinationLat.toFixed(4)}, ${flow.destinationLng.toFixed(4)}`}</span>
            </div>
          )}
          {flow.routeError && (
            <div className="mb-3 bg-danger/5 border border-danger/20 text-danger text-xs rounded-lg px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={13} />
              {flow.routeError}
            </div>
          )}
          {flow.route && (
            <div className="mb-3 flex gap-2">
              <div className="flex-1 bg-surface rounded-lg py-2 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">DIST</p>
                <p className="font-mono font-bold text-navy text-sm">{(flow.route.distance_m / 1000).toFixed(1)} km</p>
              </div>
              <div className="flex-1 bg-surface rounded-lg py-2 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk tracking-wider">TIME</p>
                <p className="font-mono font-bold text-navy text-sm">{Math.round(flow.route.duration_s / 60)}分</p>
              </div>
              <div className="flex-1 bg-accent/10 border border-accent/20 rounded-lg py-2 text-center">
                <p className="text-[10px] text-accent-dark font-grotesk tracking-wider">STOPS</p>
                <p className="font-mono font-bold text-accent-dark text-sm">{flow.route.intersections.length}</p>
              </div>
            </div>
          )}
          {!flow.route ? (
            <button
              onClick={flow.fetchRoute}
              disabled={flow.destinationLat == null || flow.isLoadingRoute}
              className="w-full bg-navy text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-navy-light disabled:opacity-40 font-grotesk tracking-wide"
            >
              {flow.isLoadingRoute ? (
                <><Loader2 size={17} className="animate-spin" />ルート取得中...</>
              ) : (
                <><Navigation size={17} />ルートを取得</>
              )}
            </button>
          ) : (
            <button
              onClick={flow.goToConfirm}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-primary-dark"
            >
              <ShieldCheck size={17} />
              おうちの人と確認する
            </button>
          )}
        </div>
      </div>
    )
  }

  // ===== フェーズ3: 保護者確認 =====
  if (flow.phase === 'confirm' && flow.route) {
    return (
      <div className="h-full bg-surface flex flex-col">
        <div className="bg-white/90 backdrop-blur-md px-5 py-4 border-b border-navy/[0.06]">
          <h1 className="text-lg font-serif font-bold text-navy">おうちの人と確認しよう</h1>
          <p className="text-xs text-navy/35 mt-0.5">走り出すまえに、いっしょにチェックしてね</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="bg-white border border-navy/[0.06] rounded-xl p-4">
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-navy">
                <MapPin size={13} className="text-primary flex-shrink-0" />
                <span className="truncate">{flow.originName ?? '出発地'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-navy">
                <Navigation size={13} className="text-danger flex-shrink-0" />
                <span className="truncate">{flow.destinationName ?? '目的地'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-surface rounded-lg py-2.5 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk">DISTANCE</p>
                <p className="font-mono font-bold text-navy">{(flow.route.distance_m / 1000).toFixed(1)} km</p>
              </div>
              <div className="flex-1 bg-surface rounded-lg py-2.5 text-center">
                <p className="text-[10px] text-navy/35 font-grotesk">TIME</p>
                <p className="font-mono font-bold text-navy">約{Math.round(flow.route.duration_s / 60)}分</p>
              </div>
            </div>
          </div>

          <div className="bg-accent/[0.08] border-2 border-accent/25 rounded-xl p-6 text-center">
            <p className="text-accent-dark text-sm font-serif font-semibold mb-2">この道には</p>
            <p className="text-6xl font-mono font-black text-accent leading-none my-3">
              {flow.route.intersections.length}
            </p>
            <p className="text-accent-dark text-sm font-serif font-semibold">つの交差点があるよ</p>
            <p className="text-accent-dark/60 text-xs mt-3">ぜんぶの交差点でいちどとまろうね！</p>
          </div>

          <div className="border-l-[3px] border-primary pl-4 py-1">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck size={16} className="text-primary" />
              <p className="text-sm font-serif font-bold text-navy">保護者の方へ</p>
            </div>
            <ul className="space-y-2 text-sm text-navy/65">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">01</span>
                <span>経路上に <b className="text-navy">{flow.route.intersections.length}箇所</b> の交差点があります</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">02</span>
                <span>すべての交差点で一時停止するようお子さまに声かけをお願いします</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5 font-mono text-xs">03</span>
                <span>走行中はスマートフォンをさわらないよう伝えてください</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-5 pt-3 pb-6 border-t border-navy/[0.06] safe-area-bottom space-y-2">
          <button
            onClick={flow.startRiding}
            className="w-full bg-success text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:bg-success-dark"
          >
            <CheckCircle size={17} />
            かくにんできたら走行開始！
          </button>
          <button
            onClick={flow.goBackToDestination}
            className="w-full text-navy/35 text-sm py-2"
          >
            もどる
          </button>
        </div>
      </div>
    )
  }

  // ===== フェーズ4: 走行中 =====
  return (
    <div className="h-full bg-navy flex flex-col relative overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={flow.currentLat != null ? [flow.currentLat, flow.currentLng!] : flow.originLat != null ? [flow.originLat, flow.originLng!] : [35.6812, 139.7671]}
          zoom={16}
          style={{ height: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flow.route && (
            <Polyline
              positions={flow.route.geometry.map((c) => [c[0], c[1]] as [number, number])}
              color="#1a56db"
              weight={4}
              opacity={0.7}
            />
          )}
          {flow.route?.intersections.map((ix) => (
            <Marker
              key={ix.index}
              position={[ix.lat, ix.lng]}
              icon={ix.stopped ? intersectionStoppedIcon : intersectionPendingIcon}
            >
              <Popup>
                交差点 #{ix.index + 1}
                {ix.stopped ? ' (停止済み)' : ''}
              </Popup>
            </Marker>
          ))}
          {flow.currentLat != null && (
            <Marker position={[flow.currentLat, flow.currentLng!]} icon={defaultIcon}>
              <Popup>現在地</Popup>
            </Marker>
          )}
          {flow.destinationLat != null && flow.destinationLng != null && (
            <Marker position={[flow.destinationLat, flow.destinationLng]} icon={destinationIcon}>
              <Popup>目的地</Popup>
            </Marker>
          )}
        </MapContainer>

        <div className="absolute top-4 right-4 bg-navy/60 backdrop-blur-sm rounded-lg px-3 py-1.5 z-[1000]">
          <span className="text-white text-sm font-mono font-medium">{formatTime(flow.elapsedSeconds)}</span>
        </div>
        {flow.wakeLockActive && (
          <div className="absolute top-4 left-4 bg-accent/80 backdrop-blur-sm rounded-lg px-2.5 py-1 z-[1000]">
            <span className="text-white text-[10px] font-bold font-grotesk tracking-wide">SCREEN ON</span>
          </div>
        )}
        {flow.gpsError && (
          <div className="absolute top-14 inset-x-4 z-[1000]">
            <div className="bg-danger/90 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={13} />
              {flow.gpsError}
            </div>
          </div>
        )}
      </div>

      <div className="bg-navy/90 backdrop-blur-md px-5 pt-4 pb-6 safe-area-bottom border-t border-white/[0.06]">
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">SPEED</p>
            <p className="text-white text-3xl font-mono font-bold leading-none">{flow.currentSpeed.toFixed(1)}</p>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">km/h</p>
          </div>
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">GPS</p>
            <div className="flex items-center justify-center gap-1">
              <MapPin
                size={12}
                className={
                  flow.currentLat == null
                    ? 'text-white/20'
                    : flow.currentAccuracy < 10
                      ? 'text-green-400'
                      : 'text-accent'
                }
              />
              <p className="text-white text-3xl font-mono font-bold leading-none">
                {flow.currentLat == null ? '--' : flow.currentAccuracy.toFixed(0)}
              </p>
            </div>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">m</p>
          </div>
          <div className="text-center">
            <p className="text-white/30 text-[10px] font-grotesk tracking-widest mb-1">STOPS</p>
            <p className="text-white text-3xl font-mono font-bold leading-none">
              <span className="text-success">{flow.stoppedIntersections}</span>
              <span className="text-white/25 text-lg mx-0.5">/</span>
              <span>{flow.totalIntersections}</span>
            </p>
            <p className="text-white/25 text-[10px] font-grotesk mt-1">箇所</p>
          </div>
        </div>

        <button
          onClick={flow.endRiding}
          disabled={!flow.isRiding}
          className="w-full bg-danger active:bg-danger-dark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-40 font-grotesk tracking-wide"
        >
          <Square size={16} fill="currentColor" />
          走行終了
        </button>
      </div>
    </div>
  )
}
