import { motion } from "motion/react";
import { SkeletonCard } from "../metadata";

export function LoadingSkeleton() {
    return (
        <motion.div
            key="loading"
            className="w-full overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
                mass: 1.0,
            }}
        >
            <motion.div
                className="p-4 flex justify-center"
                initial={{ y: 20, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: 0.1
                }}
            >
                <div className="w-full max-w-sm">
                    <SkeletonCard />
                </div>
            </motion.div>
        </motion.div>
    );
}
