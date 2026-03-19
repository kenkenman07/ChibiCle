import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { Bike, Users, CheckCircle2, ArrowRight } from "lucide-react";
import GlobeIllustration from "../components/GlobeIllustration";
import { useRoleStore, type Role } from "../modules/role/role.state";

import LineLinkButton from "../components/LineLinkButton/LineLinkButton";

export default function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const roleStore = useRoleStore();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const handleNext = () => {
    if (!selectedRole) return;
    roleStore.set(selectedRole);
  };

  if (roleStore.role) return <Navigate replace to="/" />;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      // 【修正】overflow-hidden を overflow-y-auto に変更してスクロールできるようにしました
      className="flex-1 bg-[#f4f7f6] flex flex-col relative overflow-y-auto"
    >
      {/* ヘッダー装飾 */}
      <div className="bg-[#126f50] pt-12 pb-16 px-6 rounded-b-[2.5rem] relative overflow-hidden flex-none shadow-md">
        <div className="absolute top-0 right-0 opacity-20 transform translate-x-10 -translate-y-10">
          <GlobeIllustration />
        </div>
        <div className="relative z-10 mt-4 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide mb-2">
            はじめに
          </h1>
          <p className="text-[#a5d6c5] text-sm">
            このアプリを使用する方の
            <br />
            アカウントの種類を選択してください
          </p>
        </div>
      </div>

      <div className="px-6 -mt-8 relative z-20 flex-1 flex flex-col gap-4">
        {/* 子ども用選択カード */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedRole("child")}
          className={`relative bg-white rounded-3xl p-6 cursor-pointer transition-all duration-300 shadow-sm border-2 flex-none ${
            selectedRole === "child"
              ? "border-[#48b98b] ring-4 ring-emerald-100"
              : "border-transparent hover:border-gray-200"
          }`}
        >
          {selectedRole === "child" && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-[#48b98b]" />
            </div>
          )}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
              selectedRole === "child"
                ? "bg-[#48b98b] text-white shadow-lg shadow-emerald-200"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Bike className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            自転車に乗る人
          </h2>
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md mb-2">
            子ども用
          </span>
          <p className="text-sm text-gray-500 leading-relaxed">
            目的地を設定して、自分の自転車の走行記録や安全スコアを計測します。
          </p>
        </motion.div>

        {/* 保護者用選択カード */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedRole("parent")}
          className={`relative bg-white rounded-3xl p-6 cursor-pointer transition-all duration-300 shadow-sm border-2 flex-none ${
            selectedRole === "parent"
              ? "border-[#ff8652] ring-4 ring-orange-100"
              : "border-transparent hover:border-gray-200"
          }`}
        >
          {selectedRole === "parent" && (
            <div className="absolute top-4 right-4">
              <CheckCircle2 className="w-6 h-6 text-[#ff8652]" />
            </div>
          )}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
              selectedRole === "parent"
                ? "bg-[#ff8652] text-white shadow-lg shadow-orange-200"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">見守る人</h2>
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md mb-2">
            保護者用
          </span>
          <p className="text-sm text-gray-500 leading-relaxed">
            連携した子どものアカウントの走行記録や、交差点での検知写真を確認します。
          </p>
        </motion.div>

        {/* ボタンを画面下部に押し下げるためのスペーサー */}
        <div className="flex-1 min-h-4"></div>

        <LineLinkButton />

        {/* 次へボタン */}
        {/* 【修正】pb-12 に変更して、画面下部のセーフエリア（iPhoneのホームバー等）を確保 */}
        <div className="pb-12 pt-4">
          <button
            onClick={handleNext}
            disabled={!selectedRole}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 flex-none ${
              selectedRole
                ? "bg-[#126f50] text-white shadow-xl shadow-teal-900/20 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            次へ進む
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
