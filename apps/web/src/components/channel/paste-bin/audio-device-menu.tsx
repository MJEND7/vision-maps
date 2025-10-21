import { useState, useCallback } from "react";
import { Button } from "../../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "../../ui/dropdown-menu";
import { Mic } from "lucide-react";
import { getAvailableAudioDevices } from "@/hooks/pastebin/useRealtimeTranscription";
import { PasteBinMode } from "@/types/pastebin-component";
import { toast } from "sonner";

interface AudioDeviceMenuProps {
    onMicrophoneSelect: () => Promise<void>;
    onDeviceSelect: (deviceId: string) => Promise<void>;
}

export function AudioDeviceMenu({ onMicrophoneSelect, onDeviceSelect }: AudioDeviceMenuProps) {
    const [isLoadingDevices, setIsLoadingDevices] = useState(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

    const loadAudioDevices = useCallback(async () => {
        setIsLoadingDevices(true);
        try {
            const devices = await getAvailableAudioDevices();
            // Filter to only show monitor/virtual audio devices
            // Common patterns: "monitor", "blackhole", "soundflower", "vb-cable", "virtual", "loopback"
            const monitorDevices = devices.filter(device => {
                const label = device.label.toLowerCase();
                return label.includes('monitor') ||
                    label.includes('blackhole') ||
                    label.includes('soundflower') ||
                    label.includes('vb-cable') ||
                    label.includes('vb-audio') ||
                    label.includes('virtual') ||
                    label.includes('loopback') ||
                    label.includes('stereo mix');
            });
            setAudioDevices(monitorDevices);
        } catch (error) {
            console.error('Failed to load audio devices:', error);
            toast.error('Failed to load audio devices');
        } finally {
            setIsLoadingDevices(false);
        }
    }, []);

    return (
        <DropdownMenu onOpenChange={(open) => {
            if (open) {
                loadAudioDevices();
            }
        }}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl px-2 text-xs border-border/50 hover:border-border transition-colors"
                >
                    <Mic size={12} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={async () => {
                    try {
                        await onMicrophoneSelect();
                    } catch (error) {
                        console.error('Failed to start recording:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Failed to start microphone recording';
                        toast.error(errorMessage, { duration: 5000 });
                    }
                }}>
                    <Mic className="mr-2 h-4 w-4" />
                    Default Microphone
                </DropdownMenuItem>

                {isLoadingDevices ? (
                    <DropdownMenuItem disabled>
                        <div className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Loading devices...
                    </DropdownMenuItem>
                ) : audioDevices.length > 0 ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Virtual Audio Devices</DropdownMenuLabel>
                        {audioDevices.map((device) => (
                            <DropdownMenuItem
                                key={device.deviceId}
                                onClick={async () => {
                                    try {
                                        await onDeviceSelect(device.deviceId);
                                    } catch (error) {
                                        console.error('Failed to start recording:', error);
                                        const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
                                        toast.error(errorMessage, { duration: 5000 });
                                    }
                                }}
                                className="text-xs"
                            >
                                <Mic className="mr-2 h-3 w-3" />
                                <span className="truncate">{device.label || `Device ${device.deviceId.slice(0, 8)}`}</span>
                            </DropdownMenuItem>
                        ))}
                    </>
                ) : !isLoadingDevices ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                            No virtual audio devices found
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
