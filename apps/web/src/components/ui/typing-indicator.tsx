import { motion } from "motion/react";
import { LoadingDots } from "./loading-dots";
import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = "" }: TypingIndicatorProps) {
  return (
    <motion.div
      className={`flex items-center gap-3 p-4 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 border border-gray-200 shadow-sm">
        <Bot className="w-4 h-4" />
      </div>
      
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <LoadingDots className="text-gray-400" size="sm" />
      </div>
    </motion.div>
  );
}