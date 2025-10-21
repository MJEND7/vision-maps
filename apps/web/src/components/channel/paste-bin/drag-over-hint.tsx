import { motion } from "motion/react";

export function DragOverHint() {
    return (
        <motion.div
            key="dragover"
            className="absolute inset-0 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <span className="text-sm text-muted-foreground">
                Drop here to upload
            </span>
        </motion.div>
    );
}
