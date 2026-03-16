import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, PlayCircle, ChevronRight } from "lucide-react";

export default function Destination() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -50 },
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
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="目的地を検索..."
            className="w-full bg-gray-100 py-4 pl-12 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#48b98b] transition-all"
          />
        </div>

        <div className="flex-1 bg-gray-200 rounded-3xl mb-6 relative overflow-hidden flex items-center justify-center border-4 border-white shadow-inner">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(#48b98b 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <MapPin className="w-12 h-12 text-[#ff8652] drop-shadow-md z-10" />
          <span className="absolute bottom-4 bg-white/80 px-4 py-2 rounded-full text-sm font-bold shadow-sm backdrop-blur-sm">
            ルート表示エリア
          </span>
        </div>

        <button
          onClick={() => navigate("/riding")}
          className="w-full bg-[#ff8652] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200/50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <PlayCircle className="w-6 h-6" />
          記録を開始する
        </button>
      </div>
    </motion.div>
  );
}
