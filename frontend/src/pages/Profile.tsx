import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, ShieldAlert } from "lucide-react";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import { authRepository } from "../modules/auth/auth.repository";

export default function Profile() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 },
  };

  const currentUserStore = useCurrentUserStore();

  const handleLogout = async () => {
    await authRepository.signOut();
    currentUserStore.set(undefined);

    navigate("/signin");
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 overflow-y-auto bg-[#f4f7f6] flex flex-col"
    >
      {/* シンプルなヘッダー */}
      <div className="bg-white pt-12 pb-4 px-6 shadow-sm z-10 flex items-center justify-center">
        <h2 className="text-xl font-bold text-gray-800">アカウント設定</h2>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* 保護者のアカウント情報 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden flex-none">
          {/* 左側の緑色のアクセントライン */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#48b98b]"></div>

          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Users className="w-6 h-6 text-[#126f50]" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              連携中の保護者アカウント
            </h2>
          </div>

          {/* 保護者の情報表示 */}
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl mb-5 border border-gray-100">
            <div className="w-12 h-12 bg-[#ff8652] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
              母
            </div>
            <div>
              <p className="text-base font-bold text-gray-700">浜松 花子</p>
              <p className="text-sm text-gray-500 mt-0.5">
                hanako.h***@gmail.com
              </p>
            </div>
          </div>

          {/* 共有に関する注意事項 */}
          <div className="bg-orange-50 p-4 rounded-2xl flex items-start gap-3 border border-orange-100">
            <ShieldAlert className="w-5 h-5 text-[#ff8652] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              走行スコアと交差点での検知写真は、交通安全の見守りのため、自動的に上記の保護者アカウントへ報告されます。
            </p>
          </div>
        </div>

        {/* 下部余白を埋めてボタンを下へ押しやる */}
        <div className="flex-1"></div>

        {/* ログアウトボタン */}
        <button
          onClick={handleLogout}
          className="w-full bg-white text-red-500 py-4 rounded-2xl font-bold text-lg shadow-sm border border-red-100 flex items-center justify-center gap-2 active:scale-95 transition-transform mb-24"
        >
          <LogOut className="w-5 h-5" />
          ログアウト
        </button>
      </div>
    </motion.div>
  );
}
