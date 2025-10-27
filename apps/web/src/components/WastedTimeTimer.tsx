"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import { 
  setVisitStartTime, 
  getSecondsWithDecimalsWasted, 
  clearVisitStartTime 
} from "../utils/visitTimer";

export default function WastedTimeTimer() {
  const { user, isLoaded } = useUser();
  const [secondsWasted, setSecondsWasted] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      clearVisitStartTime();
      return;
    }

    // Set start time if not already set
    setVisitStartTime();

    // Update timer every 100ms instead of 10ms to reduce re-renders
    const interval = setInterval(() => {
      setSecondsWasted(getSecondsWithDecimalsWasted());
    }, 100);

    // Initial update
    setSecondsWasted(getSecondsWithDecimalsWasted());

    return () => clearInterval(interval);
  }, [user, isLoaded]);

  if (!isLoaded || user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.8 }}
    >
      <p className="text-xs sm:text-[18px] text-primary/80 sm:text-left text-center">
        Time not building your <span className="italic">Vision</span>: <span className="font-mono text-red-400 font-medium tabular-nums"
        style={{ minWidth: '60px', display: 'inline-block', textAlign: 'right' }}>{secondsWasted.toFixed(2)}s</span>
      </p>
    </motion.div>
  );
}
