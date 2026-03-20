import React from "react";
import { motion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

const pageVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 },
};

const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3,
};

interface ScreenWrapperProps {
  children: React.ReactNode;
  bg?: string;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  bg = "bg-slate-50",
}) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
    className={`w-full max-w-md mx-auto h-[100dvh] shadow-2xl overflow-hidden flex flex-col relative ${bg}`}
  >
    {children}
  </motion.div>
);

export default ScreenWrapper;
