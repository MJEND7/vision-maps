import { motion } from "motion/react";

interface IdleStateHelperProps {
    isDragOver: boolean;
}

export function IdleStateHelper({ isDragOver }: IdleStateHelperProps) {
    if (isDragOver) {
        return null;
    }

    return (
        <motion.div
            key="helper"
            className="mt-[2px] flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <span className="hidden sm:flex text-[10px] text-muted-foreground font-medium items-center justify-center">
                Press{" "}
                <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">Ctrl</kbd> +{" "}
                <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">V</kbd> to
                paste
            </span>
            <span className="sm:hidden flex text-[10px] text-muted-foreground font-medium items-center justify-center">
                Paste your
                <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">media</kbd>
                here
            </span>
        </motion.div>
    );
}
