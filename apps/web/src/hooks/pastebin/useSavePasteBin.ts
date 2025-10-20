import { PasteBin, PasteBinMode } from "@/types/pastebin-component";
import { NodeVariants } from "@convex/tables/nodes";
import { useRef, useState } from "react";

const PASTEBIN_SAVE = "pastebin_save"

export default function useSavePasteBin(visionId: string) {
    const saveDebounce = useRef<NodeJS.Timeout | null>(null);
    const modeDebounce = useRef<NodeJS.Timeout | null>(null);
    const KEY = `${PASTEBIN_SAVE}_${visionId}`
    const MODE_KEY = `mode_${PASTEBIN_SAVE}_${visionId}`

    const getPasteBin = (): PasteBin => {
        const data = localStorage.getItem(KEY)
        if (!data) return {
            type: undefined,
            value: undefined,
            transcription: undefined
        }
        return JSON.parse(data) as PasteBin;
    }

    let [pasteBin, setPasteBin] = useState<PasteBin>(getPasteBin());
    let [mode, setModeState] = useState<PasteBinMode>(PasteBinMode.IDLE);
    const setMode = (mode: PasteBinMode) => {
        setModeState(mode)
        if (modeDebounce.current) {
            clearTimeout(modeDebounce.current);
        }
        modeDebounce.current = setTimeout(() => {
            localStorage.setItem(MODE_KEY, mode)
        }, 2000);
    }

    const save = (type: NodeVariants, data: { value?: PasteBin["value"], transcription?: PasteBin["transcription"] }) => {
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
        }

        switch (type) {
            case NodeVariants.Transcription:
                setPasteBin((prev) => {
                    prev.type = type
                    prev.transcription = data.transcription
                    return prev;
                })
            default:
                setPasteBin((prev) => {
                    prev.type = type
                    prev.value = data.value
                    return prev;
                })
        }


        saveDebounce.current = setTimeout(() => {
            localStorage.setItem(KEY, JSON.stringify(pasteBin))
        }, 2000);

    };

    const clear = () => {
        setMode(PasteBinMode.IDLE);
        if (saveDebounce.current) {
            clearTimeout(saveDebounce.current);
        }
        if (modeDebounce.current) {
            clearTimeout(modeDebounce.current);
        }
        localStorage.removeItem(KEY)
    }


    return { mode, setMode, save, clear, saveDebounce, pasteBin }
}
