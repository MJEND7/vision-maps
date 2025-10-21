import { useState, useCallback } from "react";

export interface TranscriptChunk {
    text: string;
    timestamp: number;
}

/**
 * Hook to manage transcription state including chunks, audio blobs, and device selection
 *
 * @returns {object} Transcription state and management functions
 * @property {TranscriptChunk[]} transcriptChunks - Array of transcript chunks
 * @property {Blob | null} recordedAudioBlob - Currently recorded audio blob
 * @property {Blob[]} previousAudioBlobs - Array of previously recorded audio blobs
 * @property {string | undefined} selectedDeviceId - Selected audio device ID
 * @property {function} addChunk - Add a transcript chunk
 * @property {function} setRecordedAudioBlob - Set the recorded audio blob
 * @property {function} addPreviousAudioBlob - Add a previous audio blob
 * @property {function} setSelectedDeviceId - Set selected device ID
 * @property {function} clearAll - Clear all transcription state
 */
export function useTranscriptionState() {
    const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const [previousAudioBlobs, setPreviousAudioBlobs] = useState<Blob[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

    const addChunk = useCallback((chunk: TranscriptChunk) => {
        setTranscriptChunks((prev) => [...prev, chunk]);
    }, []);

    const addPreviousAudioBlob = useCallback((blob: Blob) => {
        setPreviousAudioBlobs((prev) => [...prev, blob]);
    }, []);

    const clearAll = useCallback(() => {
        setTranscriptChunks([]);
        setRecordedAudioBlob(null);
        setPreviousAudioBlobs([]);
        setSelectedDeviceId(undefined);
    }, []);

    return {
        transcriptChunks,
        recordedAudioBlob,
        previousAudioBlobs,
        selectedDeviceId,
        addChunk,
        setRecordedAudioBlob,
        addPreviousAudioBlob,
        setSelectedDeviceId,
        clearAll,
    };
}
