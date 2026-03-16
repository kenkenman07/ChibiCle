import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  MapPin,
  Camera,
  ShieldCheck,
  Home,
  AlertTriangle,
} from "lucide-react";

export default function Result() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, y: 50 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -50 },
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
      <div className="bg-[#48b98b] pt-12 pb-24 px-6 rounded-b-[2.5rem] relative overflow-hidden text-center text-white shadow-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/20"
        >
          <CheckCircle2 className="w-12 h-12 text-[#48b98b]" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-1">お疲れ様でした！</h1>
        <p className="text-emerald-100 text-sm">目的地に到着しました</p>
      </div>

      <div className="px-6 -mt-16 relative z-10 flex flex-col gap-6">
        {/* スコアカード */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 flex flex-col items-center"
        >
          <h2 className="text-gray-500 font-medium mb-2">今回の安全スコア</h2>
          <div className="text-6xl font-bold text-[#ff8652] mb-4 drop-shadow-sm">
            88<span className="text-2xl text-gray-400 ml-1">pt</span>
          </div>
          <div className="w-full grid grid-cols-2 gap-4 mt-2">
            <div className="bg-gray-50 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">交差点通過</span>
              <span className="font-bold text-gray-700 text-lg">
                8<span className="text-sm font-normal ml-0.5">箇所</span>
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl flex flex-col items-center">
              <span className="text-xs text-emerald-600 mb-1">安全停止</span>
              <span className="font-bold text-emerald-700 text-lg">
                7<span className="text-sm font-normal ml-0.5">箇所</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* 検知した写真セクション */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#126f50]" />
            検知した交差点の記録
          </h3>

          <div className="flex flex-col gap-4">
            {/* 成功した交差点の例 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#48b98b]" />
                  <span className="font-bold text-gray-700">
                    安全な停止を確認
                  </span>
                </div>
                <span className="text-xs text-gray-400">14:23</span>
              </div>
              <div className="w-full h-32 bg-gray-200 rounded-xl overflow-hidden relative">
                {/* ダミー画像 */}
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400"
                  alt="交差点"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">中区〇〇交差点</span>
                </div>
              </div>
            </div>

            {/* 注意が必要だった交差点の例 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#ff8652]" />
                  <span className="font-bold text-gray-700">
                    一時不停止の疑い
                  </span>
                </div>
                <span className="text-xs text-gray-400">14:35</span>
              </div>
              <div className="w-full h-32 bg-gray-200 rounded-xl overflow-hidden relative border-2 border-[#ff8652]/30">
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400"
                  alt="交差点"
                  className="w-full h-full object-cover grayscale opacity-80"
                />
                <div className="absolute inset-0 border-4 border-[#ff8652] opacity-50 rounded-xl"></div>
                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">南区△△交差点</span>
                </div>
              </div>
            </div>
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
