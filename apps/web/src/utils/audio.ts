export async function stitchAudioBlobs(blobs: Blob[]): Promise<Blob> {
    if (blobs.length === 0) {
        throw new Error('No audio blobs to stitch');
    }

    if (blobs.length === 1) {
        return blobs[0];
    }

    // Decode all audio blobs
    const audioContext = new AudioContext();
    const audioBuffers: AudioBuffer[] = [];

    for (const blob of blobs) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.push(audioBuffer);
    }

    // Calculate total length
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const numberOfChannels = audioBuffers[0].numberOfChannels;
    const sampleRate = audioBuffers[0].sampleRate;

    // Create a new buffer to hold all audio
    const stitchedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

    // Copy all audio data into the stitched buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            stitchedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
        }
        offset += buffer.length;
    }

    // Convert to WebM blob using MediaRecorder
    const mediaStream = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = stitchedBuffer;
    source.connect(mediaStream);

    const mediaRecorder = new MediaRecorder(mediaStream.stream, {
        mimeType: 'audio/webm;codecs=opus'
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };

    const stitchedBlob = await new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            resolve(blob);
        };
        mediaRecorder.onerror = reject;

        mediaRecorder.start();
        source.start();

        // Stop after the audio finishes playing
        setTimeout(() => {
            mediaRecorder.stop();
            source.stop();
        }, (totalLength / sampleRate) * 1000 + 100);
    });

    await audioContext.close();
    console.log('[Audio Stitching] Stitched blob size:', stitchedBlob.size, 'bytes');

    return stitchedBlob;
}

// Helper function to convert audio blob to WAV with timestamp metadata
export async function convertToWav(
    audioBlob: Blob,
): Promise<Blob> {
    // Decode audio data - use high sample rate for better quality
    const audioContext = new AudioContext({ sampleRate: 48000 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get audio data
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    console.log('[WAV Conversion] Channels:', numberOfChannels, 'Sample Rate:', sampleRate, 'Length:', length);

    // For mono recordings, use single channel. For stereo, interleave properly
    let pcmData: Int16Array;

    if (numberOfChannels === 1) {
        // Mono - simpler and clearer
        const channelData = audioBuffer.getChannelData(0);
        pcmData = new Int16Array(length);
        for (let i = 0; i < length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
    } else {
        // Stereo - interleave channels
        const interleaved = new Float32Array(length * numberOfChannels);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                interleaved[i * numberOfChannels + channel] = channelData[i];
            }
        }

        // Convert Float32 to Int16 with proper scaling
        pcmData = new Int16Array(interleaved.length);
        for (let i = 0; i < interleaved.length; i++) {
            const s = Math.max(-1, Math.min(1, interleaved[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
    }

    // Create WAV file with proper headers
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const byteRate = sampleRate * numberOfChannels * 2;
    const blockAlign = numberOfChannels * 2;
    const dataSize = pcmData.length * 2;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // ChunkSize
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numberOfChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Write PCM data with proper byte order (little endian)
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(offset, pcmData[i], true); // true = little endian
        offset += 2;
    }

    await audioContext.close();

    console.log('[WAV Conversion] Created WAV file:', dataSize, 'bytes');
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

