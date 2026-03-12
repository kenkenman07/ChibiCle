import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, Square } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";

const RecordPage = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState<boolean>(true);

  const handleStop = () => {
    setIsRecording(false);
    setTimeout(() => navigate("/result"), 800);
  };

  return (
    <ScreenWrapper>
      <div className="relative h-full flex flex-col bg-slate-200">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-300 flex items-center justify-center">
          <Map className="w-24 h-24 text-slate-400 opacity-50" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
          <div className="flex justify-between items-start mt-8">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center text-sm font-bold text-slate-700">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"
              />
              {isRecording ? "記録中..." : "処理中..."}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl mb-4 text-center">
            <h3 className="font-bold text-slate-800 mb-2">
              GPS & カメラ作動中
            </h3>
            <button
              onClick={handleStop}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"
            >
              <Square className="w-5 h-5 mr-2 fill-current" />
              記録を終了して結果を見る
            </button>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default RecordPage;
