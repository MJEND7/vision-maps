import { motion } from "motion/react";

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingDots({ className = "", size = "md" }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5", 
    lg: "w-2 h-2"
  };

  const containerAnimation = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity,
        repeatType: "loop" as const,
      },
    },
  };

  const dotAnimation = {
    animate: {
      y: [0, -8, 0],
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      className={`flex items-center gap-1 ${className}`}
      variants={containerAnimation}
      animate="animate"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} bg-current rounded-full`}
          variants={dotAnimation}
        />
      ))}
    </motion.div>
  );
}