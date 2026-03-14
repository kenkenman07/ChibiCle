// import { useNavigate } from "react-router-dom";
// import { User, History, ChevronRight, Play } from "lucide-react";
// import ScreenWrapper from "../components/ScreenWrapper";
// import Header from "../components/Dashboard/Header";
// import { monthlyRepository } from "../modules/monthly/monthly.repository";
// import { useCurrentUserStore } from "../modules/auth/current-user.state";
// import { useEffect, useState } from "react";
// import type { MonthlyData } from "../modules/monthly/monthly.entity";

// const DashboardPage = () => {
//   const navigate = useNavigate();
//   const { currentUser } = useCurrentUserStore();
//   const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);

//   useEffect(() => {
//     fetchMonthlyData();
//   }, []);

//   const fetchMonthlyData = async () => {
//     const now = Date.now();
//     const date = new Date(now);
//     const year = date.getFullYear();
//     const month = date.getMonth() + 1;

//     const targetMonth = `${year}-${month}`;

//     const monthly = await monthlyRepository.find(currentUser!.id, targetMonth);
//     if (monthly != null) setMonthlyData(monthly);
//   };

//   const insertNewMonth = async () => {};

//   return (
//     <ScreenWrapper>
//       <Header />

//       <div className="px-6 -mt-8 relative z-10 flex-1 overflow-y-auto pb-6">
//         <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex justify-between items-center mb-6">
//           <div className="text-center">
//             <p className="text-xs text-slate-500 mb-1">今月の総罰金額</p>
//             <p className="text-xl font-bold text-red-600">
//               ￥{monthlyData?.monthly_fines_amount}
//             </p>
//           </div>
//           <div className="w-px h-10 bg-slate-100"></div>
//           <div className="text-center">
//             <p className="text-xs text-slate-500 mb-1">違反回数</p>
//             <p className="text-xl font-bold text-slate-800">
//               {monthlyData?.monthly_violation_times}回
//             </p>
//           </div>
//           <div className="w-px h-10 bg-slate-100"></div>
//           <div className="text-center">
//             <p className="text-xs text-slate-500 mb-1">走行回数</p>
//             <p className="text-xl font-bold text-slate-800">
//               {monthlyData?.monthly_driving_times}回
//             </p>
//           </div>
//         </div>

//         <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">メニュー</h3>
//         <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
//           <button
//             onClick={() => navigate("/history")}
//             className="w-full flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
//           >
//             <div className="flex items-center">
//               <History className="w-5 h-5 text-teal-600 mr-3" />
//               <span className="text-sm font-medium text-slate-700">
//                 過去データ照会
//               </span>
//             </div>
//             <ChevronRight className="w-4 h-4 text-slate-400" />
//           </button>
//           <button
//             onClick={() => navigate("/profile")}
//             className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
//           >
//             <div className="flex items-center">
//               <User className="w-5 h-5 text-teal-600 mr-3" />
//               <span className="text-sm font-medium text-slate-700">
//                 アカウント設定
//               </span>
//             </div>
//             <ChevronRight className="w-4 h-4 text-slate-400" />
//           </button>
//         </div>

//         <button
//           onClick={() => navigate("/record")}
//           className="w-full mt-4 bg-teal-700 hover:bg-teal-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-700/30 transition-all active:scale-95"
//         >
//           <Play className="w-5 h-5 mr-2 fill-current" />
//           走行記録を開始する
//         </button>
//       </div>
//     </ScreenWrapper>
//   );
// };

// export default DashboardPage;

import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Map as MapIcon,
  ShieldCheck,
  Bike,
  MoreVertical,
  MapPin,
} from "lucide-react";
import GlobeIllustration from "../components/GlobeIllustration";

export default function Dashboard() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 overflow-y-auto pb-24"
    >
      <div className="bg-[#126f50] pt-12 pb-16 px-6 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-10 -translate-y-10">
          <GlobeIllustration />
        </div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="User"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white relative z-10 tracking-wide">
          Aokiri Drive
        </h1>
        <p className="text-[#a5d6c5] mt-1 relative z-10">
          今日も安全運転でいこう！
        </p>
      </div>

      <div className="px-6 -mt-8 relative z-20">
        <h2 className="text-xl font-bold mb-1">今月の記録</h2>
        <p className="text-sm text-gray-400 mb-4">月間データダッシュボード</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#ff8652] rounded-3xl p-5 text-white shadow-lg shadow-orange-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-white/20 w-16 h-16 rounded-bl-full" />
            <div className="flex justify-between items-start mb-6">
              <ShieldCheck className="w-6 h-6" />
              <MoreVertical className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-3xl font-bold mb-1">
              85<span className="text-sm font-normal opacity-80 ml-1">pt</span>
            </div>
            <div className="text-sm font-medium">安全スコア</div>
          </div>

          <div className="bg-[#7c83f5] rounded-3xl p-5 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#21247d]/20 w-16 h-16 rounded-bl-full" />
            <div className="flex justify-between items-start mb-6">
              <Bike className="w-6 h-6" />
              <MoreVertical className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-3xl font-bold mb-1">
              12<span className="text-sm font-normal opacity-80 ml-1">回</span>
            </div>
            <div className="text-sm font-medium">走行回数</div>
          </div>
        </div>

        <button
          onClick={() => navigate("/destination")}
          className="w-full bg-[#126f50] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <MapIcon className="w-5 h-5" />
          目的地を設定して出発
        </button>
      </div>
    </motion.div>
  );
}
