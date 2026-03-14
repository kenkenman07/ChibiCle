import { Navigate } from "react-router-dom";
import ScreenWrapper from "../components/ScreenWrapper";
import { authRepository } from "../modules/auth/auth.repository";
import { useEffect } from "react";
import { useCurrentUserStore } from "../modules/auth/current-user.state";
import SignInButton from "../components/SignIn/SignInButton";
import MainIllust from "../components/SignIn/MainIllust";

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

  if (currentUserStore.currentUser != null) return <Navigate replace to="/" />;

  return (
    <ScreenWrapper bg="bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-12">
        <MainIllust />

        <h1 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">
          青切符ドライブ{" "}
          <span className="text-sm font-normal text-slate-500">(仮)</span>
        </h1>

        <SignInButton />
      </div>
    </ScreenWrapper>
  );
};

export default SignInPage;
