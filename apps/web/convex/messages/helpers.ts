import { NodeVariants } from "../nodes/table";
import { AssistantMode, Context, edge_context } from "../utils/context";

export type NodeContextOutput = {
    context: Context;
    media?: any;
};

type NodeData = {
    title?: string;
    value?: string;
    type: NodeVariants;
    ogMetadata?: {
        title?: string;
        description?: string;
        image?: string;
    };
};

/**
 * Creates context for a generic text node
 */
export const createTextNodeContext = (
    node: NodeData,
    additionalText?: string
): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["Content"] = node.value;
    }

    if (additionalText) {
        notes.push(additionalText);
    }

    return edge_context(AssistantMode.General, node.type, {
        title: node.title || `${node.type} Node`,
        command: `Text content from ${node.type} node`,
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};

/**
 * Return both markdown Context and mediaContent for images
 */
export const createImageNodeContext = (
    node: NodeData
): { context: Context; media?: any } => {
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["Image URL"] = node.value;
    }

    if (node.ogMetadata?.description) {
        metaData["Description"] = node.ogMetadata.description;
    }

    const context = edge_context(AssistantMode.General, "Image" as NodeVariants, {
        title: node.title || "Image",
        command: "Image node in workspace",
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });

    // Attach actual media payload for OpenAI vision models
    const media =
        node.value != null
            ? {
                type: "image_url",
                image_url: {
                    url: node.value,
                    detail: "auto",
                },
            }
            : undefined;

    return { context, media };
};

/**
 * Creates context for a link/URL node
 */
export const createLinkNodeContext = (node: NodeData): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["URL"] = node.value;
    }

    if (node.ogMetadata) {
        if (node.ogMetadata.title) {
            metaData["Page Title"] = node.ogMetadata.title;
        }
        if (node.ogMetadata.description) {
            metaData["Description"] = node.ogMetadata.description;
        }
        if (node.ogMetadata.image) {
            metaData["Preview Image"] = node.ogMetadata.image;
            notes.push("Contains preview image for visual context");
        }
    }

    return edge_context(AssistantMode.General, "Link" as NodeVariants, {
        title: node.title || node.ogMetadata?.title || "Link",
        command: "External link reference",
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};

/**
 * Creates context for a YouTube video node
 */
export const createYouTubeNodeContext = (
    node: NodeData,
    transcript?: string
): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["YouTube URL"] = node.value;
    }

    if (node.ogMetadata) {
        if (node.ogMetadata.title) {
            metaData["Video Title"] = node.ogMetadata.title;
        }
        if (node.ogMetadata.description) {
            metaData["Description"] = node.ogMetadata.description;
        }
    }

    if (transcript) {
        metaData["Transcript"] = transcript;
        notes.push("Full video transcript available for reference");
    }

    return edge_context(AssistantMode.General, "YouTube" as NodeVariants, {
        title: node.title || node.ogMetadata?.title || "YouTube Video",
        command: "YouTube video content",
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};

/**
 * Creates context for a video node
 */
export const createVideoNodeContext = (node: NodeData): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["Video URL"] = node.value;
    }

    if (node.ogMetadata) {
        if (node.ogMetadata.title) {
            metaData["Video Title"] = node.ogMetadata.title;
        }
        if (node.ogMetadata.description) {
            metaData["Description"] = node.ogMetadata.description;
        }
        if (node.ogMetadata.image) {
            metaData["Thumbnail"] = node.ogMetadata.image;
            notes.push("Contains thumbnail for visual reference");
        }
    }

    return edge_context(AssistantMode.General, "Video" as NodeVariants, {
        title: node.title || node.ogMetadata?.title || "Video",
        command: "Video content reference",
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};


/**
 * Creates context for a document/file node
 */
export const createDocumentNodeContext = (
    node: NodeData,
    fileType?: string,
    extractedText?: string
): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    if (node.value) {
        metaData["File URL"] = node.value;
    }

    if (fileType) {
        metaData["File Type"] = fileType;
    }

    if (extractedText) {
        metaData["Content"] = extractedText;
        notes.push("Document content extracted and available");
    }

    return edge_context(AssistantMode.General, node.type, {
        title: node.title || "Document",
        command: "Document reference from workspace",
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};

/**
 * Creates context for a transcription node
 */
export const createTranscriptionNodeContext = (
    node: NodeData
): Context => {
    const notes: string[] = [];
    const metaData: { [key: string]: string } = {};

    // Parse transcript chunks from the value field (stored as JSON)
    if (node.value) {
        try {
            const transcriptChunks = JSON.parse(node.value);

            if (Array.isArray(transcriptChunks) && transcriptChunks.length > 0) {
                // Combine all chunks into full transcript
                const fullTranscript = transcriptChunks
                    .map((chunk: { text: string; timestamp: number }) => chunk.text)
                    .join(" ");

                metaData["Transcript"] = fullTranscript;
                notes.push(`Audio transcription with ${transcriptChunks.length} segments`);
            }
        } catch (error) {
            // If parsing fails, treat as plain text
            metaData["Content"] = node.value;
        }
    }

    return edge_context(AssistantMode.General, "Transcription" as NodeVariants, {
        title: node.title || "Audio Transcription",
        command: "Audio transcription content",
        notes: notes.length > 0 ? notes : undefined,
        metaData: Object.keys(metaData).length > 0 ? metaData : undefined,
    });
};

/**
 * Main dispatcher function that routes to appropriate context creator
 */
export const createNodeContext = (
    node: NodeData,
    additionalData?: {
        transcript?: string;
        language?: string;
        fileType?: string;
        extractedText?: string;
        contextText?: string;
        completed?: boolean;
        priority?: string;
    }
): NodeContextOutput => {
    switch (node.type) {
        case "Image":
            return createImageNodeContext(node);

        case "Link":
            return { context: createLinkNodeContext(node) };

        case "YouTube":
            return {
                context: createYouTubeNodeContext(node, additionalData?.transcript),
            };

        case "Video":
            return { context: createVideoNodeContext(node) };

        case "Transcription":
            return { context: createTranscriptionNodeContext(node) };

        case "Text":
        default:
            return {
                context: createTextNodeContext(node, additionalData?.contextText),
            };
    }
};
