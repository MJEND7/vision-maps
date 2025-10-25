import { motion, AnimatePresence } from "motion/react";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { FileText, Brain } from "lucide-react";
import { PasteBinMode } from "@/types/pastebin-component";
import { AudioDeviceMenu } from "./audio-device-menu";

interface InputControlsProps {
    ref: React.RefObject<HTMLTextAreaElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    mode: PasteBinMode;
    value: string | undefined;
    placeholder: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onMicrophoneSelect: () => Promise<void>;
    onDeviceSelect: (deviceId: string) => Promise<void>;
    onFileSelect: () => void;
    onStartPrompt?: () => void;
}

export function InputControls({
    ref,
    mode,
    value,
    placeholder,
    onChange,
    onKeyDown,
    onPaste,
    onMicrophoneSelect,
    onDeviceSelect,
    onFileSelect,
    onStartPrompt,
}: InputControlsProps) {
    const isIdleMode = mode === PasteBinMode.IDLE;

    return (
        <motion.div className="relative w-full h-full">
            <Textarea
                ref={ref}
                className={`w-full dark:bg-muted/50 border-none bg-background h-full resize-none transition-all duration-200 ${!isIdleMode
                    ? "pr-24 rounded-xl shadow-sm hover:shadow-lg focus:shadow-lg py-3 px-4"
                    : "pr-24 rounded-2xl shadow-sm hover:shadow-lg focus:shadow-lg py-0 px-4 overflow-hidden"
                    }`}
                style={{
                    lineHeight: !isIdleMode ? "1.5" : "44px",
                    minHeight: "44px"
                }}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onPaste={isIdleMode ? onPaste : undefined}
            />

            <AnimatePresence>
                {/* Compact mode buttons */}
                {isIdleMode && (
                    <motion.div
                        key="idle-buttons"
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2"
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AudioDeviceMenu
                            onMicrophoneSelect={onMicrophoneSelect}
                            onDeviceSelect={onDeviceSelect}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-[13px] px-2 text-xs border-none transition-colors"
                            onClick={onFileSelect}
                        >
                            <FileText size={12} />
                        </Button>
                        {onStartPrompt && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-[13px] px-2 text-xs border-none transition-colors"
                                onClick={onStartPrompt}
                            >
                                <Brain size={12} />
                            </Button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
