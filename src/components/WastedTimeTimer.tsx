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

    // Update timer every 10ms for smooth decimal display
    const interval = setInterval(() => {
      setSecondsWasted(getSecondsWithDecimalsWasted());
    }, 10);

    // Initial update
    setSecondsWasted(getSecondsWithDecimalsWasted());

    return () => clearInterval(interval);
  }, [user, isLoaded]);

  if (!isLoaded || user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 2.0 }}
      className="text-center"
    >
      <p className="text-xs sm:text-[18px] text-primary/80 font-bold">
        Time not building your <span className="italic">Vision</span>: <span className="font-mono text-red-400 font-medium tabular-nums"
        style={{ minWidth: '60px', display: 'inline-block', textAlign: 'right' }}>{secondsWasted.toFixed(2)}s</span>
      </p>
    </motion.div>
  );
}
