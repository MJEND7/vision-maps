import { useState, useCallback, useRef, useEffect } from 'react'
import { AssemblyAI, RealtimeTranscriber } from 'assemblyai'

export type AudioSource = 'microphone' | 'system'

interface UseRealtimeTranscriptionOptions {
    onTranscript?: (text: string) => void
    onError?: (error: Error) => void
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

    const onTranscriptRef = useRef(options.onTranscript)
    const onErrorRef = useRef(options.onError)

    // Keep refs up to date without triggering re-renders
    useEffect(() => {
        onTranscriptRef.current = options.onTranscript
        onErrorRef.current = options.onError
    }, [options.onTranscript, options.onError])

    const startRecording = useCallback(
        async (source: AudioSource = 'microphone') => {
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

                // Choose mic or system audio
                if (source === 'system') {
                    streamRef.current = await navigator.mediaDevices.getDisplayMedia({
                        audio: true,
                    })
                } else {
                    streamRef.current = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    })
                }

                // Web Audio setup - use default sample rate
                audioContextRef.current = new AudioContext()
                const actualSampleRate = audioContextRef.current.sampleRate
                console.log('[AssemblyAI] AudioContext created with sample rate:', actualSampleRate)

                // Create the Realtime transcriber with the actual sample rate
                const transcriber = new RealtimeTranscriber({
                    token,
                    encoding: 'pcm_s16le',
                    sampleRate: actualSampleRate,
                    // Don't set endUtteranceSilenceThreshold - let it use default behavior
                    // The session will stay open until we explicitly close it
                })
                transcriberRef.current = transcriber

                // Event handlers
                transcriber.on('open', ({ sessionId }) => {
                    console.log('[AssemblyAI] Realtime session opened:', sessionId)
                    setIsConnecting(false)
                    setIsRecording(true)
                })

                transcriber.on('transcript', (event) => {
                    if (!event.text || event.message_type !== 'FinalTranscript') return;
                    
                    console.log('[AssemblyAI] Final transcript chunk:', event.text)
                    // Add as a new chunk
                    setTranscriptArr((prev) => [...prev, event.text])
                    setTranscript((prev) => prev ? `${prev} ${event.text}` : event.text)
                    onTranscriptRef.current?.(event.text)
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

                micSource.connect(workletNode)
                workletNode.connect(audioContextRef.current.destination)
            } catch (err) {
                console.error('Failed to start recording:', err)
                setIsConnecting(false)
                setIsRecording(false)
                onErrorRef.current?.(err as Error)
            }
        },
        []
    )

    const stopRecording = useCallback(async () => {
        console.log('[AssemblyAI] Stop recording called by user')
        try {
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
        } catch (err) {
            console.error('[AssemblyAI] Failed to stop recording:', err)
            onErrorRef.current?.(err as Error)
        }
    }, [])

    const clearTranscript = useCallback(() => {
        setTranscript('')
        setTranscriptArr([])
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
