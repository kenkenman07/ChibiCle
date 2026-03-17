import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { StopCircle, Bike } from "lucide-react";
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

// 【追加】マップ用のインポート
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

// 【追加】現在地が更新されるたびにマップの中心を移動させるコンポーネント
function MapCenterController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // panToを使用することで、移動時にアニメーションしながら追従します
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
  let interSectionNumber: number = 0;
  let stoppedCount: number = 0;
  const unStoppedIntersections: { lat: number; lng: number }[] = [];
  const tripStore = useTripStore();
  const [intersectionNum, setIntersectionNum] = useState<number>(0);

  // routeデータを取得
  const route = trip?.route.geometry;

  // currentGpsをLeaflet用の座標配列に変換
  const currentPos: [number, number] | null = currentGps
    ? [currentGps.lat, currentGps.lng]
    : null;

  useEffect(() => {
    enableWakeLock();
    startTracking(); // ページに入ったらトラッキング開始
    return () => {
      stopTracking();
      disableWakeLock(); // ページを離れたら停止
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

    gpsPoints.map(async (p) => {
      await gpsPointSyncedRepository.update(p.id!);
    });

    const sendData = gpsPoints.map((p) => p.point);
    const result: GpsInfo = await sendCurrentLocation({
      trip_id: trip.id,
      points: sendData,
    });

    if (result.rerouted == true) await routeSearchAgain();

    await intersectionResultsRepository.insert(result.intersection_updates);

    interSectionNumber += result.intersection_updates.length;
    setIntersectionNum(interSectionNumber);
    result.intersection_updates.map((index) => {
      if (index.stopped == true) stoppedCount++;
      else unStoppedIntersections.push({ lat: index.lat, lng: index.lng });
    });

    console.log(result);
  };

  const recordScore = async () => {
    if (currentUser == null) return;
    const score: ScoreJson = {
      intersectionNumber: interSectionNumber,
      stoppedCount: stoppedCount,
      notSafetyIntersections: unStoppedIntersections,
    };
    await scoreRepository.update(currentUser.id, score);
  };

  const routeSearchAgain = async () => {
    if (trip == null) return;
    const routeData: RouteInfo = await reRoute(trip?.id);
    //console.log(routeData);
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
      {/* 【追加】上部：マップ表示エリア */}
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
            zoom={16} // ナビ画面なので少し近めのズーム
            className="absolute inset-0 z-0"
            zoomControl={false} // UIをすっきりさせるためにズームボタンを非表示
          >
            {/* 現在地に追従させる */}
            <MapCenterController center={currentPos} />

            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ルートの線を描画 */}
            {route && (
              <Polyline
                positions={route}
                color="#48b98b"
                weight={6}
                opacity={0.8}
              />
            )}

            {/* 現在地のピン */}
            <Marker position={currentPos} />
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
            現在地を取得中...
          </div>
        )}
      </div>

      {/* 【修正】下部：記録コントロールエリア（角丸のシート風） */}
      <div className="bg-[#126f50] rounded-t-[2.5rem] px-6 pt-8 pb-10 text-white relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.15)] flex flex-col items-center -mt-6">
        {/* パルスアニメーションをコントロールエリアの背景に配置 */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.05, 0.15] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute w-full h-full bg-[#48b98b] rounded-t-[2.5rem] blur-2xl top-0 left-0"
        />

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 mb-6">
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

          <div className="bg-white/10 p-5 rounded-3xl w-full max-w-sm backdrop-blur-md border border-white/20 mb-8 shadow-inner">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm opacity-90">検知した交差点</span>
              <span className="font-bold text-2xl">
                {intersectionNum}
                <span className="text-sm font-normal ml-1">箇所</span>
              </span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2">
              <div className="bg-[#48b98b] h-2 rounded-full w-1/3 shadow-[0_0_10px_rgba(72,185,139,0.5)]"></div>
            </div>
          </div>

          <button
            onClick={() => finishRiding()}
            className="w-full max-w-sm bg-white text-[#126f50] py-4 rounded-2xl font-bold text-lg shadow-[0_10px_20px_rgba(0,0,0,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <StopCircle className="w-6 h-6 text-red-500" />
            測定を終了する
          </button>
        </div>
      </div>
    </motion.div>
  );
}
