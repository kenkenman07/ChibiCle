import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  PlayCircle,
  ChevronRight,
  MapPin,
  Send,
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
type Intersection = {
  index: number;
  lat: number;
  lng: number;
  num_roads: number;
  stopped: boolean;
  min_speed_kmh: number | null;
};

type RouteData = {
  id: string;
  route: {
    geometry: LatLng[];
    intersections: Intersection[];
    distance_m: number;
    duration_s: number;
  };
};

const routeData: RouteData = {
  id: "a1b2c3d4",
  route: {
    geometry: [
      [35.681, 139.767],
      [35.682, 139.768],
      [35.683, 139.769],
    ],
    intersections: [
      {
        index: 0,
        lat: 35.685,
        lng: 139.77,
        num_roads: 3,
        stopped: false,
        min_speed_kmh: null,
      },
    ],
    distance_m: 2345.6,
    duration_s: 480.0,
  },
};

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

// 【追加】2つの座標が両方とも画面に収まるようにカメラを調整するコンポーネント
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

  const createTrip = async () => {
    if (!destination) return;
    const tripInfo = await sendTrips({
      destination_lat: destination[0],
      destination_lng: destination[1],
    });
    setTrip(tripInfo);
    console.log(trip?.id);
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
        console.log(data);
        setSuggestions(data);
      };
      fetchSuggestions();
    },
    500,
    [locationInput, showSuggestions]
  );

  const handleSelectSuggestion = async (suggestion: SearchResultInfo) => {
    setLocationInput(suggestion.display_name);
    setDestination([suggestion.lat, suggestion.lng]);
    setSuggestions([]);
    setShowSuggestions(false);

    const newPos: [number, number] = [suggestion.lat, suggestion.lng];
    setDestination(newPos);
    setPosition(newPos);
    setIsRouteSearched(false);
  };

  const handleSearchSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (destination) {
      setPosition(destination);
      createTrip();
    } else if (locationInput && suggestions!.length > 0) {
      handleSelectSuggestion(suggestions![0]);
    }
    console.log("おそらくdestinationがnull");
    setShowSuggestions(false);
  };

  const handleSearchRoute = async () => {
    if (trip == null || currentLocation == null) return;
    const routeData = await fetchRoute(trip?.id, {
      origin_lat: currentLocation[0],
      origin_lng: currentLocation[1],
    });
    console.log(routeData);
    tripStore.set(routeData);
    await tripRepository.insert(routeData);
    await intersectionResultsRepository.insert(routeData);
    setIsRouteSearched(true);
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
                setIsRouteSearched(false);
              }}
              placeholder="目的地を検索..."
              className="w-full bg-gray-100 py-4 pl-12 pr-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#48b98b] transition-all"
            />
            <button
              type="submit"
              disabled={!locationInput}
              className="absolute inset-y-0 right-4 flex items-center text-[#48b98b] disabled:text-gray-300 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {showSuggestions && suggestions!.length > 0 && locationInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {suggestions!.map((suggestion, index) => (
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
              {/* 【変更】ルート検索後は2点が収まるように調整、検索前は選択した場所へ移動 */}
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

              {/* 【変更】ルート検索済なら両方にマーカーを立て、未検索ならpositionのみ */}
              {isRouteSearched ? (
                <>
                  {currentLocation && <Marker position={currentLocation} />}
                  {destination && <Marker position={destination} />}
                </>
              ) : (
                <Marker position={position} />
              )}

              {/* 【変更】Polylineもルート検索済の時だけ表示させる */}
              {isRouteSearched && (
                <Polyline positions={routeData.route.geometry} />
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
            className="w-full bg-[#126f50] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RouteIcon className="w-6 h-6" />
            ルートを検索する
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
