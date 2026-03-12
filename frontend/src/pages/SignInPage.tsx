import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, Camera } from "lucide-react";
import ScreenWrapper from "../components/ScreenWrapper";
import { authRepository } from "../modules/auth/auth.repository";
import { useEffect } from "react";
import { useCurrentUserStore } from "../modules/auth/current-user.state";

const SignInPage = () => {
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

  const signInGoogle = async () => {
    await authRepository.signInGoogle();
  };

  if (currentUserStore.currentUser != null) return <Navigate replace to="/" />;

  return (
    <ScreenWrapper bg="bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-12">
        <div className="w-64 h-64 bg-teal-50 rounded-full flex items-center justify-center mb-8 relative">
          <ShieldAlert className="w-32 h-32 text-teal-600" />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -bottom-2 -right-2 bg-white p-3 rounded-full shadow-lg"
          >
            <Camera className="w-8 h-8 text-slate-700" />
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">
          青切符ドライブ{" "}
          <span className="text-sm font-normal text-slate-500">(仮)</span>
        </h1>
        <p className="text-sm text-slate-500 mb-12">
          正しい自転車の走行ルールを学び、
          <br />
          安全な運転を心がけましょう。
        </p>

        <button
          onClick={signInGoogle}
          className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center shadow-lg transition-colors"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5 mr-3 bg-white rounded-full p-0.5"
          />
          Google サインイン
        </button>
      </div>
    </ScreenWrapper>
  );
};

export default SignInPage;
