import { useState, useCallback, useRef, useEffect } from 'react'
import { AssemblyAI, RealtimeTranscriber } from 'assemblyai'

export type AudioSource = 'microphone' | 'device'

interface UseRealtimeTranscriptionOptions {
    onTranscript?: (text: string, timestamp: number) => void
    onError?: (error: Error) => void
}

// Helper function to get available audio input devices
export async function getAvailableAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => stream.getTracks().forEach(track => track.stop()))
            .catch(() => {})

        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevices = devices.filter(d => d.kind === 'audioinput')

        console.log('[Audio Devices] Found:', audioDevices.length, 'devices')
        return audioDevices
    } catch (error) {
        console.error('[Audio Devices] Failed to enumerate:', error)
        return []
    }
}

export function useRealtimeTranscription(
    options: UseRealtimeTranscriptionOptions = {}
) {
    const [isRecording, setIsRecording] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [transcriptArr, setTranscriptArr] = useState<string[]>([])
    const [audioSource, setAudioSource] = useState<AudioSource>('microphone')

    const transcriberRef = useRef<ReturnType<
        AssemblyAI['realtime']['transcriber']
    > | null>(null)

    const streamRef = useRef<MediaStream | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const workletNodeRef = useRef<AudioWorkletNode | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordingStartTimeRef = useRef<number>(0)

    const onTranscriptRef = useRef(options.onTranscript)
    const onErrorRef = useRef(options.onError)

    // Keep refs up to date without triggering re-renders
    useEffect(() => {
        onTranscriptRef.current = options.onTranscript
        onErrorRef.current = options.onError
    }, [options.onTranscript, options.onError])

    const startRecording = useCallback(
        async (source: AudioSource = 'microphone', deviceId?: string) => {
            try {
                setIsConnecting(true)
                setAudioSource(source)

                // Fetch temporary API key/token from your API route
                const response = await fetch('/api/transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'start' }),
                })
                if (!response.ok) throw new Error('Failed to get API key')
                const { token } = await response.json()

                // Set up audio constraints
                const audioConstraints: MediaTrackConstraints = deviceId ? {
                    // For virtual audio devices, disable all processing and be very strict about device
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                } : {
                    // For default mic, use processing
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }

                console.log('[AssemblyAI] Requesting audio with constraints:', JSON.stringify(audioConstraints))
                streamRef.current = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                })

                // Verify that the stream has audio tracks
                const audioTracks = streamRef.current.getAudioTracks()
                if (audioTracks.length === 0) {
                    throw new Error('No audio input detected. Please check your microphone permissions.')
                }

                console.log('[AssemblyAI] Audio tracks found:', audioTracks.length, 'Track:', audioTracks[0].label)
                console.log('[AssemblyAI] Audio track settings:', audioTracks[0].getSettings())

                // Web Audio setup - use default sample rate
                audioContextRef.current = new AudioContext()
                const actualSampleRate = audioContextRef.current.sampleRate
                console.log('[AssemblyAI] AudioContext created with sample rate:', actualSampleRate)

                // Create the Realtime transcriber with the actual sample rate
                const transcriber = new RealtimeTranscriber({
                    token,
                    encoding: 'pcm_s16le',
                    sampleRate: actualSampleRate,
                    endUtteranceSilenceThreshold: 500, // 500ms instead of default (much faster)
                    wordBoost: [],
                })
                transcriberRef.current = transcriber

                // Event handlers
                transcriber.on('open', ({ sessionId }) => {
                    console.log('[AssemblyAI] Realtime session opened:', sessionId)
                    // Record the exact start time when session opens
                    recordingStartTimeRef.current = Date.now()
                    setIsConnecting(false)
                    setIsRecording(true)
                })

                transcriber.on('transcript', (event) => {
                    console.log('[AssemblyAI] Transcript event received:', event.message_type, event.text)

                    if (!event.text) return;

                    // Handle final transcripts - these are committed
                    if (event.message_type === 'FinalTranscript') {
                        console.log('[AssemblyAI] Final transcript chunk:', event.text)
                        setTranscriptArr((prev) => [...prev, event.text])
                        setTranscript((prev) => prev ? `${prev} ${event.text}` : event.text)
                        onTranscriptRef.current?.(event.text, event.audio_start)
                    }

                    // Note: We're only processing FinalTranscripts for chunks
                    // PartialTranscripts are logged but not added to avoid duplicates
                })

                transcriber.on('error', (err) => {
                    console.error('[AssemblyAI] Realtime transcription error:', err)
                    onErrorRef.current?.(
                        err instanceof Error ? err : new Error(String(err))
                    )
                })

                transcriber.on('close', (code, reason) => {
                    console.log('[AssemblyAI] Realtime session closed:', code, reason)
                    console.log('[AssemblyAI] Was this expected? Check if stop was called.')
                    setIsRecording(false)
                    setIsConnecting(false)
                })

                // Connect to AssemblyAI realtime
                await transcriber.connect()

                // Load the AudioWorklet processor JS module
                await audioContextRef.current.audioWorklet.addModule(
                    '/worklet-processor.js'
                )

                const micSource =
                    audioContextRef.current.createMediaStreamSource(streamRef.current)

                // Create our custom PCM processor
                const workletNode = new AudioWorkletNode(
                    audioContextRef.current,
                    'pcm-processor'
                )
                workletNodeRef.current = workletNode

                // Handle PCM buffers coming back from Worklet thread
                let audioChunkCount = 0
                workletNode.port.onmessage = (event) => {
                    if (transcriberRef.current) {
                        audioChunkCount++
                        if (audioChunkCount % 100 === 0) {
                            console.log(`[AssemblyAI] Sent ${audioChunkCount} audio chunks`)
                        }
                        transcriberRef.current.sendAudio(event.data)
                    }
                }

                // Connect mic to worklet for processing
                micSource.connect(workletNode)
                // DO NOT connect to destination - that causes playback and feedback/overlap
                // workletNode.connect(audioContextRef.current.destination)

                // Start MediaRecorder to capture audio for file export
                audioChunksRef.current = []
                console.log('[MediaRecorder] Creating MediaRecorder for stream')
                const mediaRecorder = new MediaRecorder(streamRef.current, {
                    mimeType: 'audio/webm;codecs=opus'
                })
                mediaRecorderRef.current = mediaRecorder

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        console.log('[MediaRecorder] Data available, size:', event.data.size, 'bytes, total chunks:', audioChunksRef.current.length + 1)
                        audioChunksRef.current.push(event.data)
                    }
                }

                mediaRecorder.onerror = (event) => {
                    console.error('[MediaRecorder] Error:', event)
                }

                mediaRecorder.onstart = () => {
                    console.log('[MediaRecorder] Recording started')
                }

                mediaRecorder.onstop = () => {
                    console.log('[MediaRecorder] Recording stopped, total chunks:', audioChunksRef.current.length)
                }

                mediaRecorder.start(100) // Collect data every 100ms for better timestamp accuracy
                console.log('[MediaRecorder] Called start(), state:', mediaRecorder.state)
            } catch (err) {
                console.error('Failed to start recording:', err)

                // Clean up any partial state
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop())
                    streamRef.current = null
                }
                if (audioContextRef.current) {
                    await audioContextRef.current.close().catch(() => {})
                    audioContextRef.current = null
                }
                if (transcriberRef.current) {
                    await transcriberRef.current.close().catch(() => {})
                    transcriberRef.current = null
                }

                setIsConnecting(false)
                setIsRecording(false)
                onErrorRef.current?.(err as Error)

                // Re-throw so the caller can handle it
                throw err
            }
        },
        []
    )

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        console.log('[AssemblyAI] Stop recording called by user')
        try {
            // Stop MediaRecorder and get the audio blob
            let audioBlob: Blob | null = null
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                await new Promise<void>((resolve) => {
                    if (mediaRecorderRef.current) {
                        mediaRecorderRef.current.onstop = () => {
                            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                            audioBlob = blob
                            console.log('[MediaRecorder] Stopped, blob size:', blob.size)
                            mediaRecorderRef.current = null
                            resolve()
                        }
                        mediaRecorderRef.current.stop()
                    } else {
                        resolve()
                    }
                })
            }

            if (workletNodeRef.current) {
                workletNodeRef.current.disconnect()
                workletNodeRef.current = null
            }
            if (audioContextRef.current) {
                await audioContextRef.current.close()
                audioContextRef.current = null
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop())
                streamRef.current = null
            }
            if (transcriberRef.current) {
                console.log('[AssemblyAI] Closing transcriber connection')
                await transcriberRef.current.close()
                transcriberRef.current = null
            }
            setIsRecording(false)
            setIsConnecting(false)
            return audioBlob
        } catch (err) {
            console.error('[AssemblyAI] Failed to stop recording:', err)
            onErrorRef.current?.(err as Error)
            return null
        }
    }, [])

    const clearTranscript = useCallback(() => {
        setTranscript('')
        setTranscriptArr([])
        audioChunksRef.current = []
    }, [])

    return {
        isRecording,
        isConnecting,
        transcript,
        transcriptArr,
        audioSource,
        startRecording,
        stopRecording,
        clearTranscript,
    }
}
