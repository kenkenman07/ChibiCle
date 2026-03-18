import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { StopCircle, Bike, Timer } from "lucide-react"; // Timerアイコンを追加
import { useGps } from "../hooks/useGps";
import { useWakeLock } from "../hooks/useWakeLock";
import { useGpsStore } from "../modules/gps/gps.state";
import { gpsPointSyncedRepository } from "../modules/gpsPointSynced/gpsPointSynced.repository";
import { useTripStore } from "../modules/trip/trip.state";
import {
  reRoute,
  sendCurrentLocation,
  type GpsInfo,
  type RouteInfo,
} from "../api/apiClient";
import { intersectionResultsRepository } from "../modules/intersectionResults/intersectionResults.repository";

import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { scoreRepository } from "../modules/score/score.repository";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import type { ScoreJson } from "../modules/score/score.entity";
import { tripRepository } from "../modules/trip/trip.repository";
import { currentLocationIcon } from "./Destination";
import type { IntersectionResults } from "../modules/intersectionResults/intersectionResults.entity";

function MapCenterController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function Riding() {
  const navigate = useNavigate();
  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  };

  const { gps, startTracking, stopTracking } = useGps();
  const { enableWakeLock, disableWakeLock } = useWakeLock();
  const { trip } = useTripStore();
  const gpsStore = useGpsStore();
  const { currentGps } = useGpsStore();
  const { currentUser } = useCurrentUserStore();

  const tripStore = useTripStore();

  const route = trip?.route.geometry;

  const currentPos: [number, number] | null = currentGps
    ? [currentGps.lat, currentGps.lng]
    : null;

  // 【追加】経過時間のState
  const [elapsedTime, setElapsedTime] = useState(0);

  // 【追加】1秒ごとに経過時間をカウントアップするタイマー
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 【追加】秒数を「MM:SS」の形式にフォーマットする関数
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    enableWakeLock();
    startTracking();
    return () => {
      stopTracking();
      disableWakeLock();
    };
  }, []);

  useEffect(() => {
    if (gps == null) return;
    gpsStore.set(gps);

    gpsPointSyncedRepository.insert({
      point: gps,
      synced: 0,
    });
  }, [gps]);

  useEffect(() => {
    if (trip == null) return;
    const gpsInterval = setInterval(async () => {
      await sendGps();
    }, 5000);

    return () => clearInterval(gpsInterval);
  }, [trip]);

  const finishRiding = async () => {
    await sendGps();
    await recordScore();
    navigate("/result");
  };

  const sendGps = async () => {
    if (trip == null) return;
    const gpsPoints = await gpsPointSyncedRepository.findUnSynced();

    if (gpsPoints.length == 0) return;
    const sendData = gpsPoints.map((p) => p.point);
    const result: GpsInfo = await sendCurrentLocation({
      trip_id: trip.id,
      points: sendData,
    });

    await Promise.all(
      gpsPoints.map((p) => gpsPointSyncedRepository.update(p.id!))
    );

    if (result.rerouted == true) await routeSearchAgain();

    await intersectionResultsRepository.insert(result.intersection_updates);
  };

  const recordScore = async () => {
    if (currentUser == null) return;

    const data: IntersectionResults =
      await intersectionResultsRepository.find();
    if (data == null) return;
    const stoppedData = data.filter((i) => i.stopped);
    const score: ScoreJson = {
      intersectionNumber: data.length,
      stoppedCount: stoppedData.length,
      notSafetyIntersections: data.filter((i) => !i.stopped),
    };
    await scoreRepository.update(currentUser.id, score);
  };

  const routeSearchAgain = async () => {
    if (trip == null) return;
    const routeData: RouteInfo = await reRoute(trip?.id);

    tripStore.set(routeData);
    await tripRepository.insert(routeData);
    await intersectionResultsRepository.delete();
    await intersectionResultsRepository.insert(routeData.route.intersections);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 bg-white flex flex-col relative overflow-hidden"
    >
      <div className="flex-1 relative bg-gray-200">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none z-10"
          style={{
            backgroundImage: "radial-gradient(#48b98b 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {currentPos ? (
          <MapContainer
            center={currentPos}
            zoom={16}
            className="absolute inset-0 z-0"
            zoomControl={false}
          >
            <MapCenterController center={currentPos} />

            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {route && (
              <Polyline
                positions={route}
                color="#48b98b"
                weight={6}
                opacity={0.8}
              />
            )}

            <Marker position={currentPos} icon={currentLocationIcon} />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
            現在地を取得中...
          </div>
        )}
      </div>

      <div className="bg-[#126f50] rounded-t-[2.5rem] px-6 pt-8 pb-10 text-white relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.15)] flex flex-col items-center -mt-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.05, 0.15] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute w-full h-full bg-[#48b98b] rounded-t-[2.5rem] blur-2xl top-0 left-0"
        />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6 w-full justify-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">走行記録中...</h2>
              <p className="text-[#a5d6c5] text-xs">
                交差点での安全確認を忘れずに！
              </p>
            </div>
          </div>

          <div className="bg-white/10 p-5 rounded-3xl w-full backdrop-blur-md border border-white/20 mb-8 shadow-inner">
            {/* 【追加】経過時間の表示エリア */}
            <div className="flex justify-between items-center  border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-[#a5d6c5]" />
                <span className="text-sm opacity-90">経過時間</span>
              </div>
              <span className="font-mono font-bold text-3xl tracking-wider">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>

          <button
            onClick={() => finishRiding()}
            className="w-full bg-white text-[#126f50] py-4 rounded-2xl font-bold text-lg shadow-[0_10px_20px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <StopCircle className="w-6 h-6 text-red-500" />
            測定を終了する
          </button>
        </div>
      </div>
    </motion.div>
  );
}
