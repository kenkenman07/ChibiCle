import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Calendar, ShieldCheck, User, Bike } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="absolute bottom-0 w-full bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-6 py-4 flex justify-between items-center z-50">
      <NavItem
        icon={<Home className="w-6 h-6" />}
        active={location.pathname === "/"}
        onClick={() => navigate("/")}
      />
      <NavItem icon={<Calendar className="w-6 h-6" />} active={false} />

      <div className="relative -top-6">
        <button
          onClick={() => navigate("/destination")}
          className="w-14 h-14 bg-[#48b98b] rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 border-4 border-[#f4f7f6] active:scale-95 transition-transform"
        >
          <Bike className="w-6 h-6" />
        </button>
      </div>

      <NavItem icon={<ShieldCheck className="w-6 h-6" />} active={false} />
      <NavItem icon={<User className="w-6 h-6" />} active={false} />
    </div>
  );
}

function NavItem({
  icon,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      <div className={`${active ? "text-[#ff8652]" : ""}`}>{icon}</div>
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="w-1.5 h-1.5 bg-[#ff8652] rounded-full absolute -bottom-1"
        />
      )}
    </button>
  );
}
