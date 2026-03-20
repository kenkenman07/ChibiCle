import { Camera, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const MainIllust = () => {
  return (
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
  );
};
export default MainIllust;
