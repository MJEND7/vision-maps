const fetchYoutubeTranscript = async (url: string) => {
    try {
        // Extract video ID from URL
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        if (!videoIdMatch) {
            throw new Error("Invalid YouTube URL");
        }
        const videoId = videoIdMatch[1];

        // Use API endpoint in production, fallback to direct fetch in development
        const apiEndpoint = process.env.YOUTUBE_CAPTIONS_API_ENDPOINT;

        // Production: Use deployed Python API
        const response = await fetch(`${apiEndpoint}?video_id=${videoId}&lang=en`);
        const data = await response.json();

        if (!response.ok || data.captions.startsWith("Error:")) {
            throw new Error(data.captions || "Failed to fetch transcript from API");
        }

        return {
            success: true,
            transcript: data.captions
        };
    } catch (error) {
        console.error(`Failed to fetch YouTube transcript for ${url}:`, error);
        return {
            success: false,
            error: String(error)
        };
    }
}

export const fetchYoutubeTranscripts = async (context: {
    connectedNodes: {
        ogMetadata: any;
        id: string;
        type: string;
        title: string;
        value: string;
        thought: string | undefined;
    }[];
    contextText: string;
}) => {
    const youtubeNodes = context.connectedNodes.filter(node => node.type === "YouTube");
    return await Promise.all(
        youtubeNodes.map(async (node) => {
            const transcriptResult = await fetchYoutubeTranscript(node.value);
            return {
                ...node,
                transcript: transcriptResult.success ? transcriptResult.transcript : "Unable to fetch transcript"
            };
        })
    );
}
