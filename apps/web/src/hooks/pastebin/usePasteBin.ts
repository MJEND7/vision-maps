import { useRef, useState, useCallback, useEffect } from "react";
import { PasteBin, PasteBinMode } from "@/types/pastebin-component";
import { NodeVariants } from "@convex/tables/nodes";

const PASTEBIN_SAVE = "pastebin_save";

/**
 * Hook to persist paste bin state to localStorage with debouncing
 *
 * @param visionId - Vision ID to scope the paste bin data
 * @returns {object} Save/load functions and current state
 * @property {PasteBinMode} mode - Current mode (persisted)
 * @property {function} setMode - Update mode
 * @property {function} save - Save paste bin data (debounced)
 * @property {function} clear - Clear all persisted data
 * @property {React.MutableRefObject} saveDebounce - Debounce timer ref
 * @property {PasteBin} pasteBin - Current paste bin data
 */
export default function usePasteBin(visionId: string) {
  const saveDebounce = useRef<NodeJS.Timeout | null>(null);
  const modeDebounce = useRef<NodeJS.Timeout | null>(null);

  const KEY = `${PASTEBIN_SAVE}_${visionId}`;
  const MODE_KEY = `mode_${PASTEBIN_SAVE}_${visionId}`;

  const getPasteBin = useCallback((): PasteBin => {
    if (typeof window === "undefined")
      return {
        type: undefined,
        url: undefined,
        text: undefined,
        chatId: undefined,
        thought: undefined,
        media: undefined,
        transcription: undefined,
      };

    const data = localStorage.getItem(KEY);
    if (!data)
      return {
        type: undefined,
        url: undefined,
        text: undefined,
        chatId: undefined,
        thought: undefined,
        media: undefined,
        transcription: undefined,
      };

    return JSON.parse(data) as PasteBin;
  }, [KEY]);

  const getMode = useCallback((): PasteBinMode => {
    if (typeof window === "undefined") return PasteBinMode.IDLE;

    const savedMode = localStorage.getItem(MODE_KEY);
    return (savedMode as PasteBinMode) || PasteBinMode.IDLE;
  }, [MODE_KEY]);

  const [pasteBin, setPasteBin] = useState<PasteBin>(getPasteBin());
  const [mode, setModeState] = useState<PasteBinMode>(getMode());

  const setMode = useCallback(
    (newMode: PasteBinMode) => {
      setModeState(newMode);

      if (modeDebounce.current) {
        clearTimeout(modeDebounce.current);
      }

      modeDebounce.current = setTimeout(() => {
        if (typeof window !== "undefined") {
          localStorage.setItem(MODE_KEY, newMode);
        }
      }, 500);
    },
    [MODE_KEY]
  );

  const save = useCallback(
    (type: NodeVariants, data: Omit<PasteBin, "type">) => {
      if (saveDebounce.current) {
        clearTimeout(saveDebounce.current);
      }

      setPasteBin((prev) => {
        const updated = { ...prev, type };
        // Always merge in the provided data fields, don't rely on mode
        if (data.text !== undefined) updated.text = data.text;
        if (data.thought !== undefined) updated.thought = data.thought;
        if (data.media !== undefined) updated.media = data.media;
        if (data.transcription !== undefined)
          updated.transcription = data.transcription;
        if (data.chatId !== undefined) updated.chatId = data.chatId;
        if (data.url !== undefined) updated.url = data.url;
        return updated;
      });

      saveDebounce.current = setTimeout(() => {
        setPasteBin((current) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(KEY, JSON.stringify(current));
          }
          return current;
        });
      }, 1000);
    },
    [KEY]
  );

  const clear = useCallback(() => {
    setMode(PasteBinMode.IDLE);
    setPasteBin({
      type: undefined,
      url: undefined,
      text: "",
      chatId: undefined,
      thought: undefined,
      media: undefined,
      transcription: undefined,
    });

    if (saveDebounce.current) {
      clearTimeout(saveDebounce.current);
    }
    if (modeDebounce.current) {
      clearTimeout(modeDebounce.current);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(KEY);
      localStorage.removeItem(MODE_KEY);
    }
  }, [KEY, MODE_KEY, setMode]);

  useEffect(
    () => () => {
      if (saveDebounce.current) {
        clearTimeout(saveDebounce.current);
      }
      if (modeDebounce.current) {
        clearTimeout(modeDebounce.current);
      }
    },
    []
  );

  return { mode, setMode, save, clear, saveDebounce, pasteBin };
}
