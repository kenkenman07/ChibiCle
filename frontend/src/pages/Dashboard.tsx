import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Map as MapIcon, ClipboardCheck, User, Users } from "lucide-react";
import GlobeIllustration from "../components/GlobeIllustration";
import { useRoleStore } from "../modules/role/role.state";
import { useEffect, useState } from "react";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import type { MonthlyData } from "../modules/monthly/monthly.entity";
import { monthlyRepository } from "../modules/monthly/monthly.repository";
import { tripRepository } from "../modules/trip/trip.repository";
import { intersectionResultsRepository } from "../modules/intersectionResults/intersectionResults.repository";
import { gpsPointSyncedRepository } from "../modules/gpsPointSynced/gpsPointSynced.repository";
import ScoreContent from "../components/Dashboard/ScoreContents";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUserStore();
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);

  const { role } = useRoleStore();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  //indexedDBのクリア
  useEffect(() => {
    const clearIndexedDB = async () => {
      await tripRepository.delete();
      await intersectionResultsRepository.delete();
      await gpsPointSyncedRepository.delete();
    };

    clearIndexedDB();
  }, []);

  useEffect(() => {
    const initMonthlyData = async () => {
      const now = Date.now();
      const date = new Date(now);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const nowMonth = `${year}-${month}`;
      await insertNewMonth(nowMonth);
      await fetchMonthlyData(nowMonth);
    };

    initMonthlyData();
  }, [currentUser]);

  const fetchMonthlyData = async (nowMonth: string) => {
    if (currentUser == null) return;

    const monthly = await monthlyRepository.find(currentUser.id, nowMonth);

    if (monthly != null) setMonthlyData(monthly);
  };

  const insertNewMonth = async (nowMonth: string) => {
    if (currentUser == null) return;

    await monthlyRepository.insert(currentUser.id, nowMonth);
  };

  return (
    // 【修正点】flex flex-col を追加
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 overflow-y-auto bg-[#126f50] flex flex-col"
    >
      {/* ヘッダーセクション */}
      <div className="bg-[#126f50] pt-12 pb-20 px-6 relative overflow-hidden flex-none">
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-10 -translate-y-10">
          <GlobeIllustration />
        </div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          {/* 【追加】現在のアカウント種別を示すバッジ */}
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/30">
            {role === "child" ? (
              <>
                <User className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white tracking-wider">
                  子ども用アカウント
                </span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white tracking-wider">
                  保護者用アカウント
                </span>
              </>
            )}
          </div>

          {/* アバター（タップでロールを切り替え） */}
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 bg-white/30 rounded-full border-2 border-white overflow-hidden active:scale-90 transition-transform cursor-pointer"
          >
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                role === "child" ? "Felix" : "Sarah"
              }`}
              alt="User"
            />
          </button>
        </div>

        <h1 className="text-3xl font-bold text-white relative z-10 tracking-wide">
          ChibiCle
        </h1>
        {/* 【追加】ロールによってサブタイトルを変更 */}
        <p className="text-[#a5d6c5] mt-1 relative z-10">
          {role === "child"
            ? "今日も安全運転でいこう！"
            : "子どもの安全を見守りましょう"}
        </p>
      </div>

      <div className="bg-[#f4f7f6] px-6 pt-8 pb-32 rounded-t-[2.5rem] -mt-10 relative z-20 flex-1 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          {role === "child" ? "今月の記録" : "子どもの今月の記録"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">月間データダッシュボード</p>

        <ScoreContent
          monthlyDrivingTimes={monthlyData!.monthly_driving_times}
          monthlyScore={monthlyData!.monthly_score}
        />

        {/* 下の余白を埋める */}
        <div className="flex-1"></div>

        {/* 【変更】ロールに応じて表示するボタンを切り替え */}
        {role === "child" ? (
          <button
            onClick={() => navigate("/destination")}
            className="w-full bg-[#126f50] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <MapIcon className="w-5 h-5" />
            目的地を設定して出発
          </button>
        ) : (
          <button
            onClick={() => navigate("/result")} // 最新のResultページ等へ遷移
            className="w-full bg-[#ff8652] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200/50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <ClipboardCheck className="w-6 h-6" />
            最新の走行結果を確認する
          </button>
        )}
      </div>
    </motion.div>
  );
}
