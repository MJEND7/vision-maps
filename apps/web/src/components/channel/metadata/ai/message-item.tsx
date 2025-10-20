"use client"

import { motion } from "motion/react";
import { Doc } from "@convex/_generated/dataModel";

type Props = {
    message: Doc<"messages">;
    children: React.ReactNode;
    isUser: boolean;
};

export default function MessageItem({ children, isUser, }: Props) {
    // const formatTime = (timestamp: number) => {
    //     const date = new Date(timestamp);
    //     const now = new Date();
    //     const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    //     if (diffInHours < 24) {
    //         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    //     }
    //     return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    // };

    return (
        <>
            <motion.div
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <div
                    className={`flex gap-3 max-w-[95%] ${isUser && "flex-row-reverse"}`}
                >
                    <div className="flex flex-col gap-1">
                        <motion.div
                            className={`text-xs  ${isUser
                                ? "rounded-2xl px-4 py-3 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                : "text-primary"
                                } ${isUser ? "rounded-br-md" : "rounded-md"}`}
                        >
                            {children}
                        </motion.div>

                    </div>
                </div>
            </motion.div>
        </>
    );
}
