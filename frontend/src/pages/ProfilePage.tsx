// import { useNavigate } from "react-router-dom";
// import { ChevronRight, User, Mail, LogOut } from "lucide-react";
// import ScreenWrapper from "../components/ScreenWrapper";
// import { authRepository } from "../modules/auth/auth.repository";
// import { useCurrentUserStore } from "../modules/auth/current-user.state";

// const ProfilePage = () => {
//   const navigate = useNavigate();
//   const currentUserStore = useCurrentUserStore();

//   const handleLogout = async () => {
//     await authRepository.signOut();
//     currentUserStore.set(undefined);

//     navigate("/signin");
//   };

//   return (
//     <ScreenWrapper>
//       {/* ヘッダー */}
//       <div className="bg-teal-700 text-white px-4 py-4 shadow-md z-10 flex items-center mt-8">
//         <button onClick={() => navigate(-1)} className="p-2 mr-2">
//           <ChevronRight className="w-6 h-6 rotate-180" />
//         </button>
//         <h2 className="text-lg font-bold">プロフィール</h2>
//       </div>

//       <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col">
//         {/* プロフィールアイコンと名前 */}
//         <div className="flex flex-col items-center mt-6 mb-8">
//           <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4 shadow-sm border-4 border-white">
//             <User className="w-12 h-12 text-teal-600" />
//           </div>
//           <h3 className="text-2xl font-bold text-slate-800">テスト ユーザー</h3>
//         </div>

//         {/* ユーザー情報リスト */}
//         <div className="space-y-4 mb-8">
//           <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
//             <div className="bg-slate-50 p-3 rounded-xl mr-4">
//               <User className="w-5 h-5 text-slate-500" />
//             </div>
//             <div>
//               <p className="text-xs text-slate-400 mb-1">名前</p>
//               <p className="font-semibold text-slate-800">テスト ユーザー</p>
//             </div>
//           </div>

//           <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center">
//             <div className="bg-slate-50 p-3 rounded-xl mr-4">
//               <Mail className="w-5 h-5 text-slate-500" />
//             </div>
//             <div>
//               <p className="text-xs text-slate-400 mb-1">メールアドレス</p>
//               <p className="font-semibold text-slate-800">
//                 test.user@example.com
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* ログアウトボタン */}
//         <div className="mt-auto pt-6">
//           <button
//             onClick={handleLogout}
//             className="w-full bg-white border border-red-100 hover:bg-red-50 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center shadow-sm transition-colors"
//           >
//             <LogOut className="w-5 h-5 mr-2" />
//             ログアウト
//           </button>
//         </div>
//       </div>
//     </ScreenWrapper>
//   );
// };

// export default ProfilePage;

import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, ShieldAlert } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 },
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
          onClick={() => navigate("/signin")}
          className="w-full bg-white text-red-500 py-4 rounded-2xl font-bold text-lg shadow-sm border border-red-100 flex items-center justify-center gap-2 active:scale-95 transition-transform mb-24"
        >
          <LogOut className="w-5 h-5" />
          ログアウト
        </button>
      </div>
    </motion.div>
  );
}
