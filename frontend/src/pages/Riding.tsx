import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { StopCircle, Bike } from "lucide-react";

export default function Riding() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  };

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
