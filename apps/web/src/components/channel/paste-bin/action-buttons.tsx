import { motion, AnimatePresence } from "motion/react";
import { Button } from "../../ui/button";
import { X, Send, Square } from "lucide-react";
import { PasteBinMode } from "@/types/pastebin-component";

interface ActionButtonsProps {
    mode: PasteBinMode;
    isRecording: boolean;
    isConnecting: boolean;
    isStopping: boolean;
    isUploading: boolean;
    isUploadingAudio: boolean;
    isValidForCreation: boolean;
    onClose: () => void;
    onCreate: () => void;
    onStopRecording: () => void;
}

export function ActionButtons({
    mode,
    isRecording,
    isConnecting,
    isStopping,
    isUploading,
    isUploadingAudio,
    isValidForCreation,
    onClose,
    onCreate,
    onStopRecording,
}: ActionButtonsProps) {
    const isIdleMode = mode === PasteBinMode.IDLE;

    return (
        <AnimatePresence>
            {!isIdleMode && (
                <motion.div
                    className="absolute right-2 bottom-2 flex gap-2"
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25
                    }}
                >
                    {/* Close button */}
                    <motion.div
                        key="close-button"
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <X size={14} />
                        </Button>
                    </motion.div>

                    {/* Main action button */}
                    <motion.div
                        key="send-button"
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 30, opacity: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        {mode === PasteBinMode.TRANSCRIPTION && (isRecording || isConnecting || isStopping) ? (
                            <Button
                                size="sm"
                                onClick={onStopRecording}
                                disabled={isConnecting || isStopping}
                                className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all duration-200"
                            >
                                {isStopping ? (
                                    <>
                                        <div className="w-3 h-3 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Stopping...
                                    </>
                                ) : (
                                    <>
                                        <Square size={12} className="mr-1" />
                                        Stop
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={onCreate}
                                disabled={
                                    (isUploading || isUploadingAudio) ||
                                    !isValidForCreation
                                }
                                className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all duration-200"
                            >
                                {isUploadingAudio ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send size={12} />
                                )}
                            </Button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
