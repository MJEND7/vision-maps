"use client"

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FigmaCardWithImage } from "../channel/metadata/figma-card";
import { Send, X } from "lucide-react";
import { Button } from "../ui/button";

export function DemoPasteBin() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full max-w-xs sm:max-w-lg">
            <div className="relative space-y-2">
                {/* Floating metadata container */}
                <motion.div
                    className=""
                    initial={{ width: "10rem" }}
                    animate={{ width: "100%" }}
                    transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                >
                    <motion.div
                        className="w-full overflow-hidden rounded-2xl shadow-md border border-accent bg-background"
                        initial={{ height: "2rem", padding: "4px" }}
                        animate={{ height: "auto", padding: "0px" }}
                        transition={{ type: "tween", duration: 0.2, ease: "easeOut", delay: 0.1 }}
                    >
                        <div className="relative flex flex-col items-center justify-center">
                            {isLoaded && (
                                <motion.div
                                    className="w-full overflow-hidden"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.3 }}
                                >
                                    <motion.div
                                        className="p-4 flex justify-center"
                                        initial={{ y: 20, scale: 0.95 }}
                                        animate={{ y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.4 }}
                                    >
                                        <div className="w-full">
                                            <FigmaCardWithImage />
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Input at bottom */}
                <motion.div
                    className="relative"
                    initial={{ height: "44px" }}
                    animate={{ height: "120px" }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut", delay: 0.2 }}
                >
                    <motion.div className="relative w-full h-full">
                        <div
                            className="w-full dark:bg-background bg-background h-full resize-none transition-all duration-200 rounded-xl shadow-sm border border-border py-3 px-4 text-sm text-muted-foreground"
                        >
                            Type thought...
                        </div>

                        <motion.div
                            className="absolute right-2 bottom-2 flex gap-2"
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
                        >
                            <motion.div
                                initial={{ x: 40, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 40, opacity: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </Button>
                            </motion.div>

                            <motion.div
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.65 }}
                            >
                                <Button
                                    size="sm"
                                    className="pointer-events-none h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                                >
                                    <Send size={12} />
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
