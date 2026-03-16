import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { StopCircle, Bike } from "lucide-react";
import { useGps } from "../hooks/useGps";
import { useWakeLock } from "../hooks/useWakeLock";

export default function Riding() {
  const navigate = useNavigate();
  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  };
  const { gps, gpsError, startTracking, stopTracking } = useGps();
  const { enableWakeLock, disableWakeLock} = useWakeLock();

  useEffect(() => {
    enableWakeLock()
    startTracking(); // ページに入ったらトラッキング開始
    return () => {
      stopTracking(),
      disableWakeLock() ; // ページを離れたら停止
    }
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 bg-[#126f50] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute w-64 h-64 bg-[#48b98b] rounded-full blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 backdrop-blur-md">
          <Bike className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold mb-2">走行記録中...</h2>
        <p className="text-[#a5d6c5] mb-12">交差点での安全確認を忘れずに！</p>

        {/* GPS情報表示 */}
        {gps && (
  <motion.div
    key={gps.recorded_at} // 更新のたびにmotionアニメーション
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ duration: 0.5 }}
    className="text-sm mb-4"
  >
    <p>緯度: {gps.lat.toFixed(5)}</p>
    <p>経度: {gps.lng.toFixed(5)}</p>
    <p>速度: {gps.speed_kmh ? gps.speed_kmh.toFixed(1) + " km/h" : "不明"}</p>
    <p>精度: {gps.accuracy_m.toFixed(1)} m</p>
    <p>測位時刻: {new Date(gps.recorded_at).toLocaleTimeString()}</p>
  </motion.div>
)}



        <div className="bg-white/10 p-6 rounded-3xl w-full max-w-sm backdrop-blur-md border border-white/20 mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm opacity-80">検知した交差点</span>
            <span className="font-bold text-xl">3</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2">
            <div className="bg-[#48b98b] h-2 rounded-full w-1/3"></div>
          </div>
        </div>

        <button
          onClick={() => navigate("/result")}
          className="w-full max-w-sm bg-white text-[#126f50] py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <StopCircle className="w-6 h-6 text-red-500" />
          測定を終了する
        </button>
      </div>
    </motion.div>
  );
}
