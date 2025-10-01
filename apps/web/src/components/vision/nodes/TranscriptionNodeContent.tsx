'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWavesurfer } from '@wavesurfer/react';

interface TranscriptChunk {
  text: string;
  timestamp: number; // ms
}

interface TranscriptionNodeContentProps {
  audioUrl: string;
  transcriptChunks: TranscriptChunk[];
  recordingStartTime?: number; // ms when recording started
}

export function TranscriptionNodeContent({
  audioUrl,
  transcriptChunks,
  recordingStartTime,
}: TranscriptionNodeContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const startTime = recordingStartTime || transcriptChunks[0]?.timestamp || 0;

  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(-1);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { wavesurfer, isReady } = useWavesurfer({
    container: containerRef,
    height: 50,
    waveColor: '#888',
    progressColor: '#0581fc',
    normalize: true,
    barWidth: 2,
    barGap: 1.5,
    barRadius: 2,
    cursorColor: 'hsl(var(--primary))',
    dragToSeek: true,
    url: audioUrl,
  });

  useEffect(() => {
    if (!wavesurfer) return;

    const onReady = () => setDuration(wavesurfer.getDuration());
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFinish = () => setIsPlaying(false);
    const onTimeupdate = (time: number) => setCurrentTime(time);

    wavesurfer.on('ready', onReady);
    wavesurfer.on('play', onPlay);
    wavesurfer.on('pause', onPause);
    wavesurfer.on('finish', onFinish);
    wavesurfer.on('timeupdate', onTimeupdate);

    return () => {
      wavesurfer.un('ready', onReady);
      wavesurfer.un('play', onPlay);
      wavesurfer.un('pause', onPause);
      wavesurfer.un('finish', onFinish);
      wavesurfer.un('timeupdate', onTimeupdate);
    };
  }, [wavesurfer]);

  // Sync transcript highlight with playback
  useEffect(() => {
    if (!transcriptChunks.length) return;

    const currentAbs = startTime + currentTime * 1000;
    let newIndex = -1;
    for (let i = transcriptChunks.length - 1; i >= 0; i--) {
      if (currentAbs+1000 >= transcriptChunks[i].timestamp) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== activeChunkIndex) {
      setActiveChunkIndex(newIndex);

      const el = scrollContainerRef.current?.querySelector(
        `[data-chunk="${newIndex}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, transcriptChunks, startTime, activeChunkIndex]);

  const togglePlayPause = () => {
    wavesurfer?.playPause();
  };

  const handleChunkClick = (chunk: TranscriptChunk) => {
    if (!wavesurfer || !isReady) return;
    const relTime = ((chunk.timestamp - startTime) / 1000) - 1;
    //setActiveChunkIndex(index);
    wavesurfer.play(relTime, duration);
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-5 space-y-5 shadow-md">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:scale-105 transition-transform"
          onClick={togglePlayPause}
          disabled={!isReady}
        >
          {!isReady ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={20} />
          ) : (
            <Play size={20} />
          )}
        </Button>

        <div className="flex-1 flex flex-col">
          <div
            ref={containerRef}
            className="w-full cursor-pointer rounded-md overflow-hidden z-[5]"
          />
          <div className="flex justify-between pt-1 text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[220px] overflow-y-auto no-scrollbar border-t border-border/50 pt-4 space-y-2"
      >
        {transcriptChunks.map((chunk, i) => {
          const rel = (chunk.timestamp - startTime) / 1000;
          const isActive = i === activeChunkIndex;

          return (
            <div
              key={i}
              data-chunk={i}
              onClick={() => handleChunkClick(chunk)}
              className={`flex gap-3 cursor-pointer items-start p-3 rounded-lg border text-sm transition-all leading-relaxed
                ${
                  isActive
                    ? 'bg-primary/15 border-primary/60 text-primary font-medium shadow-sm'
                    : 'hover:bg-accent/30 border-transparent text-foreground'
                }`}
            >
              <span className="text-[11px] text-muted-foreground font-mono pt-1 min-w-[48px]">
                {formatTime(rel)}
              </span>
              <span className="flex-1">{chunk.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
