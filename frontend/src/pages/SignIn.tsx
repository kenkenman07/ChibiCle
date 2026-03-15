import { useEffect } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, Bike } from "lucide-react";
import GlobeIllustration from "../components/GlobeIllustration";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import { authRepository } from "../modules/auth/auth.repository";

export default function SignIn() {
  const navigate = useNavigate();

  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  };

  const currentUserStore = useCurrentUserStore();

  useEffect(() => {
    checkUserSignIn();
  }, []);

  const checkUserSignIn = async () => {
    const currentUser = await authRepository.getCurrentUser();
    if (currentUser != null) {
      currentUserStore.set(currentUser);
    }
  };

  if (currentUserStore.currentUser != null) return <Navigate replace to="/" />;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="flex-1 bg-[#126f50] flex flex-col relative overflow-hidden"
    >
      {/* 背景装飾 */}
      <div className="absolute top-10 -right-20 opacity-30 transform scale-150">
        <GlobeIllustration />
      </div>

      {/* 上部コンテンツ：ロゴとコンセプト */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md shadow-lg shadow-teal-900/20 border border-white/30">
          <Bike className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-wider drop-shadow-md">
          Aokiri Drive
        </h1>
        <p className="text-[#a5d6c5] text-center font-medium leading-relaxed">
          自転車の安全な走行をサポート。
          <br />
          交差点での「止まる」を見守ります。
        </p>

        <div className="mt-8 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
          <ShieldCheck className="w-5 h-5 text-[#ff8652]" />
          <span className="text-sm text-white font-medium">
            16歳からの自転車新ルール対応
          </span>
        </div>
      </div>

      {/* 下部コンテンツ：ログインアクション */}
      <div className="bg-[#f4f7f6] rounded-t-[2.5rem] px-8 py-12 flex flex-col items-center shadow-[0_-20px_40px_rgba(0,0,0,0.1)] relative z-20">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          アカウントにログイン
        </h2>

        {/* Googleサインインボタン */}
        <button
          onClick={() => navigate("/")}
          className="w-full bg-white text-gray-700 py-4 px-4 rounded-2xl font-bold text-lg shadow-md border border-gray-200 flex items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-gray-50 hover:shadow-lg"
        >
          {/* Google Logo SVG */}
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Googleでログイン
        </button>

        <p className="mt-6 text-xs text-gray-400 text-center">
          ログインすることで、利用規約および
          <br />
          プライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </motion.div>
  );
}
