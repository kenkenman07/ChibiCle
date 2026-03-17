import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Home, AlertTriangle } from "lucide-react";
import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import { scoreRepository } from "../modules/score/score.repository";
import { useEffect, useState } from "react";

// ダミーの「安全に通れなかったポイント」データ
const unsafePoints = [
  {
    id: 1,
    lat: 34.705,
    lng: 137.733,
    time: "14:23",
    reason: "一時不停止の疑い",
    locationName: "中区〇〇交差点",
  },
  {
    id: 2,
    lat: 34.7,
    lng: 137.738,
    time: "14:35",
    reason: "減速不十分",
    locationName: "南区△△交差点",
  },
];

// ダミーの走行結果データ
const resultData = {
  score: 88,
  safeIntersections: 8,
  unsafeCount: unsafePoints.length,
  savedAt: new Date("2026-03-17T15:30:00"),
};

export default function Result() {
  const navigate = useNavigate();

  // 保存された日時から「日」と「時」を取得
  const { currentUser } = useCurrentUserStore();
  const [date, setDate] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);

  const pageVariants = {
    initial: { opacity: 0, y: 50 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -50 },
  };

  useEffect(() => {
    fetchResult();
  });

  const fetchResult = async () => {
    if (!currentUser) return;
    const data = await scoreRepository.find(currentUser.id);
    if (data == null) return;
    const date = new Date(data.created_at);
    setDate(date.getDate());
    setHours(date.getHours());
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 bg-[#f4f7f6] flex flex-col overflow-y-auto pb-8"
    >
      {/* お疲れ様ヘッダー */}
      {/* 【修正】flex-none を追加して高さが圧縮されるのを防ぎ、pb-32 で確実な余白を確保 */}
      <div className="bg-[#48b98b] pt-12 pb-32 px-6 rounded-b-[2.5rem] relative overflow-hidden text-center text-white shadow-md flex-none">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/20"
        >
          <CheckCircle2 className="w-12 h-12 text-[#48b98b]" />
        </motion.div>

        <h1 className="relative z-20 text-2xl font-bold mb-3">
          {date}日、{hours}時の走行結果
        </h1>

        <div className="flex items-center justify-center gap-1.5 text-emerald-100 text-sm bg-white/10 w-max mx-auto px-4 py-1.5 rounded-full backdrop-blur-sm relative z-20">
          <span className="font-medium">お疲れ様でした！</span>
        </div>
      </div>

      <div className="px-6 -mt-12 relative z-10 flex flex-col gap-6">
        {/* スコアカード */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 flex flex-col items-center"
        >
          <h2 className="text-gray-500 font-medium mb-2">今回の安全スコア</h2>
          <div className="text-6xl font-bold text-[#ff8652] mb-4 drop-shadow-sm">
            {resultData.score}
            <span className="text-2xl text-gray-400 ml-1">pt</span>
          </div>
          <div className="w-full grid grid-cols-2 gap-4 mt-2">
            <div className="bg-gray-50 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">交差点通過</span>
              <span className="font-bold text-gray-700 text-lg">
                {resultData.safeIntersections}
                <span className="text-sm font-normal ml-0.5">箇所</span>
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs text-emerald-600 mb-1">安全停止</span>
              <span className="font-bold text-emerald-700 text-lg">
                {resultData.safeIntersections - resultData.unsafeCount}
                <span className="text-sm font-normal ml-0.5">箇所</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* 要注意ポイントのマップセクション */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#ff8652]" />
            安全に通行できなかった箇所
          </h3>

          {/* マップ表示エリア */}
          <div className="bg-gray-200 rounded-3xl relative overflow-hidden border-4 border-white shadow-inner h-64 z-10">
            <MapContainer
              center={[34.7024, 137.7353]} // 浜松駅周辺を中心に設定
              zoom={14}
              className="absolute inset-0 z-0"
            >
              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* 危険だった箇所をプロット */}
              {unsafePoints.map((point) => (
                <Marker key={point.id} position={[point.lat, point.lng]}>
                  <Popup>
                    <div className="text-sm font-bold text-[#ff8652]">
                      {point.reason}
                    </div>
                    <div className="text-xs text-gray-500">{point.time}</div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* 要注意ポイントのリスト表示 */}
          <div className="flex flex-col gap-3">
            {unsafePoints.length === 0 && (
              <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
                <ShieldCheck className="w-6 h-6 text-[#48b98b] mx-auto mb-2" />
                <p className="text-sm text-emerald-700 font-bold">
                  全ての交差点を安全に通行できました！
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ダッシュボードへ戻るボタン */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          <button
            onClick={() => navigate("/")}
            className="w-full bg-[#126f50] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Home className="w-5 h-5" />
            ダッシュボードに戻る
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
