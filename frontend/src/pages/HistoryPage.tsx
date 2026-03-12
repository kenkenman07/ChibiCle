import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";

const HistoryPage = () => {
  const navigate = useNavigate();
  return (
    <ScreenWrapper>
      <div className="bg-teal-700 text-white px-4 py-4 shadow-md z-10 flex items-center mt-8">
        <button onClick={() => navigate(-1)} className="p-2 mr-2">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h2 className="text-lg font-bold">過去データ照会</h2>
      </div>

      <div className="flex-1 relative bg-slate-200">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-300">
          <div className="absolute top-1/4 left-1/3">
            <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
            </div>
          </div>
          <div className="absolute top-1/2 left-2/3">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
          <h3 className="font-bold text-slate-800 mb-4">違反多発エリア</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs mr-3">
                  1
                </div>
                <span className="text-sm font-medium text-slate-700">
                  浜松市中区... 交差点
                </span>
              </div>
              <span className="text-xs font-bold text-red-600">計3回</span>
            </div>
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
};

export default HistoryPage;
