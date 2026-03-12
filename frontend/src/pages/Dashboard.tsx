import { useNavigate } from "react-router-dom";
import { User, History, ChevronRight, Play } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";

const DashboardPage = () => {
  const navigate = useNavigate();
  return (
    <ScreenWrapper>
      <div className="bg-teal-700 px-6 pt-12 pb-6 rounded-b-3xl shadow-md text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">テスト ユーザー</h2>
            </div>
          </div>
          <div className="px-3 py-1 bg-teal-600 rounded-full text-xs font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
            Online
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8 relative z-10 flex-1 overflow-y-auto pb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex justify-between items-center mb-6">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">今月の総罰金額</p>
            <p className="text-xl font-bold text-red-600">¥12,000</p>
          </div>
          <div className="w-px h-10 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">違反回数</p>
            <p className="text-xl font-bold text-slate-800">4回</p>
          </div>
          <div className="w-px h-10 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">走行回数</p>
            <p className="text-xl font-bold text-slate-800">12回</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">メニュー</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center">
              <History className="w-5 h-5 text-teal-600 mr-3" />
              <span className="text-sm font-medium text-slate-700">
                過去データ照会
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center">
              <User className="w-5 h-5 text-teal-600 mr-3" />
              <span className="text-sm font-medium text-slate-700">
                アカウント設定
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <button
          onClick={() => navigate("/record")}
          className="w-full mt-4 bg-teal-700 hover:bg-teal-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-700/30 transition-all active:scale-95"
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          走行記録を開始する
        </button>
      </div>
    </ScreenWrapper>
  );
};

export default DashboardPage;
