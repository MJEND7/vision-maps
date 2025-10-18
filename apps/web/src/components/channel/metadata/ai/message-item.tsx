"use client"

import { motion } from "motion/react";
import { Doc } from "@convex/_generated/dataModel";
import { RotateCw, GitBranch, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    message: Doc<"messages">;
    children: React.ReactNode;
    isUser: boolean;
    onRetry?: () => void;
    onBranch?: () => void;
    onCreateTextNode?: () => void;
};

export default function MessageItem({ children, isUser, onRetry, onBranch, onCreateTextNode }: Props) {
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

                        {/* Action buttons - only for AI messages */}
                        {!isUser && (onRetry || onBranch || onCreateTextNode) && (
                            <div className="flex gap-1 self-start">
                                {/* Retry button for AI messages */}
                                {onRetry && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onRetry}
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        title="Retry from this response"
                                    >
                                        <RotateCw className="w-3 h-3 mr-1" />
                                        Retry
                                    </Button>
                                )}

                                {/* Branch button for AI messages */}
                                {onBranch && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onBranch}
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        title="Branch from this response"
                                    >
                                        <GitBranch className="w-3 h-3 mr-1" />
                                        Branch
                                    </Button>
                                )}

                                {/* Create text node button for AI messages */}
                                {onCreateTextNode && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onCreateTextNode}
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        title="Create text node from this response"
                                    >
                                        <FileText className="w-3 h-3 mr-1" />
                                        Text Node
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}
