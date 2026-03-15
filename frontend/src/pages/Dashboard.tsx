import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Map as MapIcon, ShieldCheck, Bike } from "lucide-react";
import GlobeIllustration from "../components/GlobeIllustration";

export default function Dashboard() {
  const navigate = useNavigate();
  //   const { currentUser } = useCurrentUserStore();
  //   const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

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
          <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="User"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white relative z-10 tracking-wide">
          Aokiri Drive(仮)
        </h1>
        <p className="text-[#a5d6c5] mt-1 relative z-10">
          今日も安全運転でいこう！
        </p>
      </div>

      {/* メインコンテンツ */}
      {/* 【修正点】min-h-screen を削除し、flex-1 に変更 */}
      <div className="bg-[#f4f7f6] px-6 pt-8 pb-32 rounded-t-[2.5rem] -mt-10 relative z-20 flex-1 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <h2 className="text-xl font-bold text-gray-800 mb-1">今月の記録</h2>
        <p className="text-sm text-gray-500 mb-6">月間データダッシュボード</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#ff8652] rounded-3xl p-5 text-white shadow-lg shadow-orange-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-white/20 w-16 h-16 rounded-bl-full" />
            <div className="flex justify-between items-start mb-6">
              <ShieldCheck className="w-6 h-6" />
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
