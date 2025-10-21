import { motion } from "motion/react";
import { Button } from "../../ui/button";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { TranscriptChunk } from "@/hooks/pastebin/useTranscriptionState";

interface TranscriptionPanelProps {
    isRecording: boolean;
    isConnecting: boolean;
    transcriptChunks: TranscriptChunk[];
    transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
    onContinueRecording: () => Promise<void>;
}

export function TranscriptionPanel({
    isRecording,
    isConnecting,
    transcriptChunks,
    transcriptContainerRef,
    onContinueRecording,
}: TranscriptionPanelProps) {
    return (
        <motion.div
            key="transcription"
            className="w-full h-[300px] overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "300px", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
                type: "spring",
                stiffness: 280,
                damping: 30,
                mass: 1.0,
            }}
        >
            <div className="h-full w-full p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}></div>
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                            {isConnecting ? 'Connecting...' : isRecording ? 'Recording' : 'Transcription Complete'}
                        </span>
                    </div>
                    {!isRecording && !isConnecting && transcriptChunks.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await onContinueRecording();
                                } catch (error) {
                                    console.error('Failed to restart recording:', error);
                                    const errorMessage = error instanceof Error ? error.message : 'Failed to continue recording';
                                    toast.error(errorMessage, { duration: 5000 });
                                }
                            }}
                            className="h-6 px-2 text-xs"
                        >
                            <Mic size={12} className="mr-1" />
                            Continue
                        </Button>
                    )}
                </div>

                <div
                    ref={transcriptContainerRef}
                    className="flex-1 overflow-y-auto overscroll-contain bg-background/50 rounded-lg p-3 border border-purple-500/20 space-y-2"
                >
                    {transcriptChunks.length > 0 ? (
                        transcriptChunks.map((chunk, index) => {
                            const date = new Date(chunk.timestamp);
                            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                            return (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 text-[10px] text-muted-foreground/60 font-mono mt-0.5 min-w-[60px]">
                                        {timeString}
                                    </div>
                                    <div className="flex-1 text-sm bg-accent/30 rounded-lg px-3 py-2 border border-accent/50">
                                        {chunk.text}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <span className="text-muted-foreground text-sm">
                            {isConnecting ? 'Connecting to transcription service...' : 'Start speaking...'}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
