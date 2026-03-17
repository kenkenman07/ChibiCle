import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  PlayCircle,
  ChevronRight,
  MapPin,
  Route as RouteIcon,
  Navigation,
} from "lucide-react";
import { useGps } from "../hooks/useGps";
import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet"; // 【追加】Leaflet本体をインポート
import { useDebounce } from "react-use";
import { useTripStore } from "../modules/trip/trip.state";
import { tripRepository } from "../modules/trip/trip.repository";
import { intersectionResultsRepository } from "../modules/intersectionResults/intersectionResults.repository";
import {
  fetchRoute,
  searchPlace,
  sendTrips,
  type SearchResultInfo,
  type TripInfo,
} from "../api/apiClient";

type LatLng = [number, number];

// 【追加】画像を使わないカスタムマーカー（現在地用：緑色）
export const currentLocationIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background-color: #48b98b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

// 【追加】画像を使わないカスタムマーカー（目的地用：オレンジ色）
const destinationIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background-color: #ff8652; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transform: translate(-50%, -100%) rotate(-45deg);"></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const currentCenter = map.getCenter();
      const distance = currentCenter.distanceTo([center[0], center[1]]);
      if (distance > 10) {
        map.flyTo(center, 15, { duration: 1.5 });
      }
    }
  }, [center, map]);
  return null;
}

function RouteBoundsController({ start, end }: { start: LatLng; end: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([start, end], { padding: [50, 50], duration: 1.5 });
  }, [start, end, map]);
  return null;
}

export default function Destination() {
  const navigate = useNavigate();
  const { gps, getCurrentGpsOnce } = useGps();
  const [currentLocation, setCurrentLocation] = useState<
    [number, number] | null
  >(null);
  const [locationInput, setLocationInput] = useState<string>("");
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResultInfo[] | null>(
    null
  );

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRouteSearched, setIsRouteSearched] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const tripStore = useTripStore();
  const [trip, setTrip] = useState<TripInfo | null>(null);

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -50 },
  };

  useEffect(() => {
    getCurrentGpsOnce();
  }, []);

  useEffect(() => {
    if (gps && !position) {
      setCurrentLocation([gps.lat, gps.lng]);
      setPosition([gps.lat, gps.lng]);
    }
  }, [gps]);

  useEffect(() => {
    return () => {
      tripRepository.delete();
      intersectionResultsRepository.delete();
    };
  }, []);

  const createTrip = async (destination: [number, number]) => {
    if (!destination) return;
    const tripInfo = await sendTrips({
      destination_lat: destination[0],
      destination_lng: destination[1],
    });
    setTrip(tripInfo);
  };

  useDebounce(
    () => {
      if (!locationInput || !showSuggestions) {
        setSuggestions([]);
        return;
      }

      const fetchSuggestions = async () => {
        const data: SearchResultInfo[] = await searchPlace({
          location_name: locationInput,
          limit: 6,
        });
        if (data == null) return;

        setSuggestions(data);
      };
      fetchSuggestions();
    },
    500,
    [locationInput, showSuggestions]
  );

  const handleSelectSuggestion = async (suggestion: SearchResultInfo) => {
    setLocationInput(suggestion.display_name);
    const dest: [number, number] = [suggestion.lat, suggestion.lng];

    setDestination(dest);
    setPosition(dest);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsRouteSearched(false);

    await createTrip(dest);
  };

  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (locationInput && suggestions && suggestions.length > 0) {
      await handleSelectSuggestion(suggestions[0]);
    } else if (destination && !trip) {
      await createTrip(destination);
    }

    setShowSuggestions(false);
  };

  const handleSearchRoute = async () => {
    if (trip == null || currentLocation == null) return;

    const routeData = await fetchRoute(trip?.id, {
      origin_lat: currentLocation[0],
      origin_lng: currentLocation[1],
    });

    tripStore.set(routeData);
    setIsRouteSearched(true);

    await tripRepository.insert(routeData);
    await intersectionResultsRepository.insert(routeData.route.intersections);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 flex flex-col bg-white"
    >
      <div className="pt-12 pb-4 px-6 bg-white shadow-sm z-10 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded-full"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h2 className="text-xl font-bold">目的地設定</h2>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="relative z-20 mb-6">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                setShowSuggestions(true);
                setDestination(null);
                setTrip(null);
                setIsRouteSearched(false);
              }}
              placeholder="目的地を検索..."
              className="w-full bg-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#48b98b] transition-all"
            />
          </form>

          {showSuggestions &&
            suggestions &&
            suggestions.length > 0 &&
            locationInput && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors border-b last:border-b-0 border-gray-50"
                  >
                    <MapPin className="w-5 h-5 text-[#48b98b] shrink-0" />
                    <span className="text-gray-700 text-sm truncate">
                      {suggestion.display_name}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
        </div>

        <div className="bg-gray-200 rounded-3xl mb-6 relative overflow-hidden border-4 border-white shadow-inner h-72 z-10">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#48b98b 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {position ? (
            <MapContainer
              center={position}
              zoom={15}
              className="absolute inset-0 z-0"
            >
              {isRouteSearched && currentLocation && destination ? (
                <RouteBoundsController
                  start={currentLocation}
                  end={destination}
                />
              ) : (
                <MapController center={position} />
              )}

              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* 【修正】アイコンに先ほど作成したカスタムアイコンを指定 */}
              {isRouteSearched ? (
                <>
                  {currentLocation && (
                    <Marker
                      position={currentLocation}
                      icon={currentLocationIcon}
                    />
                  )}
                  {destination && (
                    <Marker position={destination} icon={destinationIcon} />
                  )}
                </>
              ) : (
                <Marker position={position} icon={currentLocationIcon} />
              )}

              {isRouteSearched && (
                <Polyline
                  positions={
                    tripStore.trip ? tripStore.trip.route.geometry : []
                  }
                  color="#48b98b" // 【追加】ルートの線をアプリのテーマカラー(緑)に変更
                  weight={5}
                />
              )}
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-medium">
              現在地を取得中...
            </div>
          )}
        </div>

        {!destination ? (
          <button
            key="disabled-btn"
            disabled
            className="w-full bg-gray-200 text-gray-400 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Navigation className="w-6 h-6" />
            目的地を設定してください
          </button>
        ) : !isRouteSearched ? (
          <motion.button
            key="search-route-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSearchRoute}
            disabled={trip == null}
            className="w-full bg-[#126f50] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-wait"
          >
            <RouteIcon className="w-6 h-6" />
            {trip == null ? "ルートを準備中..." : "ルートを検索する"}
          </motion.button>
        ) : (
          <motion.button
            key="start-record-btn"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => navigate("/riding")}
            className="w-full bg-[#ff8652] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200/50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <PlayCircle className="w-6 h-6" />
            記録を開始する
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
