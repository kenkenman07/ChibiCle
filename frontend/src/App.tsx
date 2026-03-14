// import { BrowserRouter, Route, Routes } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import SignInPage from "./pages/SignInPage";
// import RecordPage from "./pages/RecordPage";
// import ResultPage from "./pages/ResultPage";
// import HistoryPage from "./pages/HistoryPage";
// import Layout from "./Layout";
// import ProfilePage from "./pages/ProfilePage";
// import SignIn from "./pages/SignIn";

// function App() {
//   return (
//     <>
//       <BrowserRouter>
//         <Routes>
//           <Route path="/signin" element={<SignIn />} />

//           <Route path="/" element={<Layout />}>
//             <Route index element={<Dashboard />} />
//             <Route path="/record" element={<RecordPage />} />
//             <Route path="/result" element={<ResultPage />} />
//             <Route path="/history" element={<HistoryPage />} />
//             <Route path="profile" element={<ProfilePage />} />
//           </Route>
//         </Routes>
//       </BrowserRouter>
//     </>
//   );
// }

// export default App;

import React from "react";
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
import Result from "./pages/Result"; // 追加
import BottomNav from "./components/BottomNav";

function AppContent() {
  const location = useLocation();

  // ボトムナビゲーションを隠すパスに '/result' を追加
  const hideNav = ["/riding", "/signin", "/result"].includes(location.pathname);

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen font-sans text-gray-800">
      <div className="w-full max-w-[400px] bg-[#f4f7f6] min-h-screen relative overflow-hidden shadow-2xl flex flex-col">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/destination" element={<Destination />} />
            <Route path="/riding" element={<Riding />} />
            <Route path="/result" element={<Result />} /> {/* 追加 */}
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
