import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Dashboard from "./pages/Dashboard";
import Destination from "./pages/Destination";
import Riding from "./pages/Riding";
import SignIn from "./pages/SignIn";
import Result from "./pages/Result";
import Profile from "./pages/Profile"; // 追加
import BottomNav from "./components/BottomNav";
import RoleSelect from "./pages/RoleSelect";
import { useEffect, useState } from "react";
import { useCurrentUserStore } from "./modules/auth/current-user.state";
import { authRepository } from "./modules/auth/auth.repository";

function AppContent() {
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const currentUserStore = useCurrentUserStore();

  useEffect(() => {
    setSession();
  }, []);

  const setSession = async () => {
    const currentUser = await authRepository.getCurrentUser();
    currentUserStore.set(currentUser);
    setIsLoading(false);
  };

  if (isLoading) return <div />;

  // ボトムナビゲーションを隠すパス
  const hideNav = ["/riding", "/signin", "/result", "/role"].includes(
    location.pathname
  );

  return (
    <div className="flex justify-center bg-gray-100 h-[100dvh] font-sans text-gray-800 overflow-hidden">
      <div className="w-full bg-[#f4f7f6] h-full relative overflow-hidden shadow-2xl flex flex-col">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="role" element={<RoleSelect />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/destination" element={<Destination />} />
            <Route path="/riding" element={<Riding />} />
            <Route path="/result" element={<Result />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AnimatePresence>

        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
