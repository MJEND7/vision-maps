import { motion } from "motion/react";
import { Button } from "../../ui/button";
import { Brain } from "lucide-react";

interface TextModeHelperProps {
    onStartPrompt: () => void;
}

export function TextModeHelper({ onStartPrompt }: TextModeHelperProps) {
    return (
        <motion.div
            key="text-mode"
            className="w-full overflow-hidden p-4 flex justify-center"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
                type: "tween",
                duration: 0.15,
                ease: "easeOut"
            }}
        >
            <div className="w-full text-center">
                <div className="flex flex-col items-center gap-1 text-gray-500">
                    <Button
                        size="sm"
                        onClick={onStartPrompt}
                        className="px-3 py-2 text-xs rounded-lg bg-primary group hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                    >
                        <Brain className="dark:group-hover:text-blue-500 group-hover:text-purple-400" size={14} /> Start a Prompt
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
