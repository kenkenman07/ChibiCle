import { useNavigate } from "react-router-dom";
import { AlertCircle, Camera, MapPin } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";

const ResultPage = () => {
  const navigate = useNavigate();
  return (
    <ScreenWrapper>
      <div className="bg-teal-700 text-white px-6 py-6 text-center shadow-md z-10">
        <h2 className="text-lg font-bold mt-6">走行結果</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center mb-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">今回の罰金額</p>
          <p className="text-4xl font-black text-slate-800 my-2">¥12,000</p>
          <p className="text-xs text-red-500 bg-red-50 py-1 px-3 rounded-full inline-block font-medium">
            2件の違反が検知されました
          </p>
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">違反詳細</h3>

        <div className="space-y-3 mb-8">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start">
            <div className="bg-red-100 p-2 rounded-lg mr-3 mt-1">
              <Camera className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 text-sm">信号無視</h4>
                <span className="text-sm font-bold text-slate-800">¥6,000</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> 浜松市中区... 交差点
              </p>
              <div className="w-full h-24 bg-slate-200 rounded-lg mt-3 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1517424075244-12347900b84c?auto=format&fit=crop&q=80&w=400&h=200"
                  alt="証拠画像"
                  className="object-cover opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-start">
            <div className="bg-orange-100 p-2 rounded-lg mr-3 mt-1">
              <MapPin className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 text-sm">一時不停止</h4>
                <span className="text-sm font-bold text-slate-800">¥6,000</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> ○○小学校前
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-4 rounded-xl flex items-center justify-center shadow-lg transition-colors"
        >
          ダッシュボードへ戻る
        </button>
      </div>
    </ScreenWrapper>
  );
};

export default ResultPage;
