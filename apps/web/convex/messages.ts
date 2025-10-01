import { query, mutation, httpAction, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { PersistentTextStreaming, StreamId } from "@convex-dev/persistent-text-streaming";
import { v, Infer } from "convex/values";
import { requireAuth } from "./utils/auth";
import { components, internal } from "./_generated/api";
import { PaginationOptions, paginationOptsValidator } from "convex/server";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";
import { getUserPlan } from "./auth";
import { requirePermission, Permission } from "./permissions";
import { fetchYoutubeTranscripts } from "./utils/youtube";

// Args schemas
const listMessagesByChatArgs = v.object({
    chatId: v.id("chats"),
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    paginationOpts: paginationOptsValidator

});

const clearMessagesArgs = v.object({
    chatId: v.id("chats"),
});

const sendMessageArgs = v.object({
    chatId: v.id("chats"),
    content: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
});

const getChatHistoryArgs = v.object({
    chatId: v.id("chats"),
});

const getStreamBodyArgs = v.object({
    streamId: v.string(),
});

const generateChatNameActionArgs = v.object({
    chatId: v.id("chats"),
    messageContent: v.string(),
});

const getConnectedNodeContextArgs = v.object({
    chatId: v.id("chats"),
});

export const persistentTextStreaming = new PersistentTextStreaming(
    components.persistentTextStreaming
);

export const listMessagesByChat = query({
    args: listMessagesByChatArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Authentication required");
        }

        // Verify user owns the chat
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            // Return empty result instead of throwing error for deleted chats
            return { page: [], isDone: true, continueCursor: "" };
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only access your own chats");
        }

        // Handle both direct args and paginationOpts for compatibility
        const numItems = args.paginationOpts?.numItems ?? args.numItems ?? 20;
        const cursor = args.paginationOpts?.cursor ?? args.cursor ?? null;

        const query = ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .order("desc");

        const paginationOpts: PaginationOptions = {
            numItems,
            cursor
        };

        return await query.paginate(paginationOpts);
    },
});

export const clearMessages = mutation({
    args: clearMessagesArgs,
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .collect();
        await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
    },
});

export const sendMessage = mutation({
    args: sendMessageArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id")
        }

        // Check AI permission
        const plan = await getUserPlan(ctx.auth);
        requirePermission(plan, Permission.AI_NODES);

        // Check if this is the first user message in the chat
        const existingMessages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .filter((q) => q.eq(q.field("role"), "user"))
            .collect();

        const isFirstMessage = existingMessages.length === 0;

        const streamId = await persistentTextStreaming.createStream(ctx);
        const messageId = await ctx.db.insert("messages", {
            chatId: args.chatId,
            content: args.content,
            userId: identity.userId?.toString(),
            role: "user",
            streamId: streamId.toString(),
            replyToMessageId: args.replyToMessageId,
        });

        // If this is the first message, trigger chat naming action
        if (isFirstMessage) {
            // Schedule the naming action to run asynchronously (non-blocking)
            await ctx.scheduler.runAfter(0, internal.messages.generateChatNameAction, {
                chatId: args.chatId,
                messageContent: args.content
            });
        }

        return { messageId, streamId: streamId.toString() };
    },
});

export const getChatHistory = internalQuery({
    args: getChatHistoryArgs,
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .collect();

        const joinedResponses = await Promise.all(
            messages.map(async (message) => {
                if (message.role === "user" && message.streamId) {
                    const responseMessage = await persistentTextStreaming.getStreamBody(
                        ctx,
                        message.streamId as StreamId
                    );
                    return {
                        userMessage: message,
                        assistantContent: responseMessage.text,
                    };
                }
                return { userMessage: message, assistantContent: null };
            })
        );

        return joinedResponses.flatMap((joined) => {
            const user = {
                role: "user" as const,
                content: joined.userMessage.content,
                _id: joined.userMessage._id,
            };

            if (joined.assistantContent) {
                const assistant = {
                    role: "assistant" as const,
                    content: joined.assistantContent,
                };
                return [user, assistant];
            }

            return [user];
        });
    },
});

export const getStreamBody = query({
    args: getStreamBodyArgs,
    handler: async (ctx, args) => {
        return await persistentTextStreaming.getStreamBody(
            ctx,
            args.streamId as StreamId
        );
    },
});

export const streamChat = httpAction(async (ctx, request) => {
    const body = (await request.json()) as {
        streamId: string;
    };

    //const messageId = request.headers.get("x-message-id");
    const chatId = request.headers.get("x-chat-id");

    // Start streaming and persisting at the same time while
    // we immediately return a streaming response to the client
    const response = await persistentTextStreaming.stream(
        ctx,
        request,
        body.streamId as StreamId,
        async (ctx, _, __, append) => {
            const history = await ctx.runQuery(internal.messages.getChatHistory, { chatId: chatId as Id<"chats"> });
            const nodeContext = await ctx.runQuery(internal.messages.getConnectedNodeContext, { chatId: chatId as Id<"chats"> });

            // Fetch YouTube transcripts for connected YouTube nodes
            const youtubeTranscripts = await fetchYoutubeTranscripts(nodeContext);

            const openai = new OpenAI()

            // Build system message with connected node context
            let systemContent = `You are a helpful assistant that can answer questions and help with tasks.
            Please provide your response in markdown format. You are continuing a conversation.
            The conversation so far is found in the following JSON-formatted value:`;

            // Add connected node context with YouTube transcripts
            if (nodeContext.contextText || youtubeTranscripts.length > 0) {
                systemContent += `IMPORTANT: Additional context from connected nodes in the visual workspace:
                -----`;

                // Add regular node context
                if (nodeContext.contextText) {
                    systemContent += `\n${nodeContext.contextText}`;
                }

                // Add YouTube transcripts
                if (youtubeTranscripts.length > 0) {
                    youtubeTranscripts.forEach(node => {
                        systemContent += `\n--- ${node.title} (YouTube) ---\n`;
                        systemContent += `YouTube URL: ${node.value}\n\n`;
                        systemContent += `Transcript:\n${node.transcript}\n\n`;
                    });
                    systemContent += "END CONNECTED NODE CONTEXT\n\n";
                }

                systemContent += `-----
                Use this connected node context to inform your responses when relevant.
                Please make sure you state the title of the node when you use it.`;
            }

            // Collect images and files from connected nodes for OpenAI vision/file support
            const mediaContent: any[] = [];

            nodeContext.connectedNodes.forEach((node: any) => {
                // Handle Image nodes directly
                if (node.type === "Image") {
                    mediaContent.push({
                        type: "image_url",
                        image_url: {
                            url: node.value,
                            detail: "auto"
                        }
                    });
                }

                // Handle media nodes with image metadata (thumbnails, etc.)
                if (node.ogMetadata?.image &&
                    (node.type === "YouTube" || node.type === "Link" || node.type === "Video")) {
                    mediaContent.push({
                        type: "image_url",
                        image_url: {
                            url: node.ogMetadata.image,
                            detail: "auto"
                        }
                    });
                }
            });

            // Build messages array with media content if available
            const messages: any[] = [
                {
                    role: "system",
                    content: systemContent,
                },
                ...history
            ];

            // If we have media content, add it to the last user message or create a new one
            if (mediaContent.length > 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage?.role === "user") {
                    // Convert string content to array format and add media
                    const content = [
                        { type: "text", text: lastMessage.content },
                        ...mediaContent
                    ];
                    lastMessage.content = content;
                } else {
                    // Add a new message with just media content
                    messages.push({
                        role: "user",
                        content: [
                            { type: "text", text: "Please analyze the connected media content:" },
                            ...mediaContent
                        ]
                    });
                }
            }

            // Lets kickoff a stream request to OpenAI
            const stream = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages,
                stream: true,
            });

            // Append each chunk to the persistent stream as they come in from openai
            for await (const part of stream)
                await append(part.choices[0]?.delta?.content || "");
        }
    );

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Vary", "Origin");

    return response;
});

// Internal mutation for updating chat and node titles
export const updateChatAndNodeTitle = internalMutation({
    args: v.object({
        chatId: v.id("chats"),
        title: v.string(),
    }),
    handler: async (ctx, args) => {
        const chat = await ctx.db.get(args.chatId);

        // Update the chat title
        await ctx.db.patch(args.chatId, {
            title: args.title,
        });

        // If there's a linked node, update its title too
        if (chat?.nodeId) {
            const node = await ctx.db.get(chat.nodeId);
            if (node) {
                await ctx.db.patch(chat.nodeId, {
                    title: args.title,
                    updatedAt: new Date().toISOString(),
                });
            }
        }
    },
});

// Get connected node context for AI chat
export const getConnectedNodeContext = internalQuery({
    args: getConnectedNodeContextArgs,
    handler: async (ctx, args) => {
        // Get the chat to find its associated AI node
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            return { connectedNodes: [], contextText: "" };

        }

        const nodeId = chat.nodeId;

        if (!nodeId) {
            return { connectedNodes: [], contextText: "" };
        }

        // Get the AI node details
        const framedNode = await ctx.db.query("framed_node").withIndex("nodeId", (q) => q.eq("node.data", nodeId)).first();
        if (!framedNode || !framedNode.node.id) {
            return { connectedNodes: [], contextText: "" };
        }

        // Find all edges where the AI node is the target (data flows INTO the AI)
        const edges = await ctx.db
            .query("edges")
            .withIndex("target", (q) => q.eq("target", framedNode._id))
            .collect();

        if (edges.length === 0) {
            return { connectedNodes: [], contextText: "" };
        }

        // Get source nodes from incoming edges
        const sourceNodeIds = edges.map(edge => edge.source);

        // Get framed nodes that match our source node IDs using the id index
        const sourceFramedNodes = await Promise.all(
            sourceNodeIds.map(async (nodeId) => {
                return await ctx.db.get(nodeId)
            })
        );

        // Filter out any null results
        const validSourceFramedNodes = sourceFramedNodes.filter(fn => fn !== null);

        // Get actual node data for each source node
        const connectedNodeData = await Promise.all(
            validSourceFramedNodes.map(async (framedNode) => {
                const nodeData = await ctx.db.get(framedNode.node.data);
                return { framedNode, nodeData };
            })
        );

        // Filter for Text and media nodes (all nodes except AI), and ensure they have valid data
        const relevantNodes = connectedNodeData
            .filter(({ nodeData }) =>
                nodeData &&
                nodeData.variant !== "AI" &&
                nodeData.value &&
                nodeData.value.trim().length > 0
            )
            .map(({ framedNode, nodeData }) => ({
                id: framedNode.node.id,
                type: nodeData!.variant,
                title: nodeData!.title || `${nodeData!.variant} Node`,
                value: nodeData!.value,
                thought: nodeData!.thought
            }));

        // Fetch OG metadata for media nodes (exclude Text nodes)
        const mediaNodesWithMetadata = await Promise.all(
            relevantNodes
                .filter(node => node.type !== "Text")
                .map(async (node) => {
                    try {
                        const ogData = await ctx.db
                            .query("og_metadata")
                            .withIndex("by_url", (q) => q.eq("url", node.value))
                            .first();

                        // Check if expired (30 days)
                        if (ogData) {
                            const now = new Date();
                            const expiresAt = new Date(ogData.expiresAt);

                            if (now <= expiresAt) {
                                return {
                                    ...node,
                                    ogMetadata: ogData.metadata
                                };
                            }
                        }

                        return {
                            ...node,
                            ogMetadata: null
                        };
                    } catch (error) {
                        console.error(`Failed to fetch OG metadata for ${node.value}:`, error);
                        return {
                            ...node,
                            ogMetadata: null
                        };
                    }
                })
        );

        // Combine text nodes (no metadata needed) with media nodes (with metadata)
        const textNodes = relevantNodes.filter(node => node.type === "Text");
        const allNodesWithMetadata = [
            ...textNodes.map(node => ({ ...node, ogMetadata: null })),
            ...mediaNodesWithMetadata
        ];

        // Create context text from connected nodes with OG metadata
        let contextText = "";
        if (allNodesWithMetadata.length > 0) {
            contextText = "CONNECTED NODE CONTEXT:\n\n";
            allNodesWithMetadata.forEach(node => {
                contextText += `--- ${node.title} (${node.type}) ---\n`;

                // For Text nodes, include content and thought
                if (node.type === "Text") {
                    contextText += `Content: ${node.value}\n`;
                    if (node.thought && node.thought.trim().length > 0) {
                        contextText += `Thought: ${node.thought}\n`;
                    }
                    contextText += "\n";
                } else {
                    // For media nodes, include URL, thought, and metadata if available
                    contextText += `URL: ${node.value}\n`;

                    if (node.thought && node.thought.trim().length > 0) {
                        contextText += `Thought: ${node.thought}\n`;
                    }

                    if (node.ogMetadata) {
                        const meta = node.ogMetadata;
                        if (meta.title) contextText += `Title: ${meta.title}\n`;
                        if (meta.description) contextText += `Description: ${meta.description}\n`;
                        if (meta.tweetText) contextText += `Tweet Content: ${meta.tweetText}\n`;
                        if (meta.author) contextText += `Author: ${meta.author}\n`;
                        if (meta.channelName) contextText += `Channel: ${meta.channelName}\n`;
                        if (meta.duration) contextText += `Duration: ${meta.duration}\n`;
                        if (meta.views) contextText += `Views: ${meta.views.toLocaleString()}\n`;
                        if (meta.likes) contextText += `Likes: ${meta.likes.toLocaleString()}\n`;
                        if (meta.stars) contextText += `Stars: ${meta.stars.toLocaleString()}\n`;
                        if (meta.forks) contextText += `Forks: ${meta.forks.toLocaleString()}\n`;
                        if (meta.language) contextText += `Language: ${meta.language}\n`;
                        if (meta.artist) contextText += `Artist: ${meta.artist}\n`;
                        if (meta.album) contextText += `Album: ${meta.album}\n`;
                        if (meta.publishedAt) contextText += `Published: ${meta.publishedAt}\n`;
                    }
                    contextText += "\n";
                }
            });
            contextText += "END CONNECTED NODE CONTEXT\n\n";
        }

        return {
            connectedNodes: allNodesWithMetadata,
            contextText
        };
    },
});

export const generateChatNameAction = internalAction({
    args: generateChatNameActionArgs,
    handler: async (ctx, args) => {
        try {
            const openai = new OpenAI();

            const response = await openai.chat.completions.create({
                model: "gpt-4.1-nano",
                messages: [
                    {
                        role: "system",
                        content: "Generate a short, descriptive title (3-6 words) for a chat conversation based on the user's first message. Return only the title, no quotes or extra text."
                    },
                    {
                        role: "user",
                        content: args.messageContent
                    }
                ],
                max_tokens: 20,
                temperature: 0.3,
            });

            const generatedTitle = response.choices[0]?.message?.content?.trim();

            if (!generatedTitle) {
                return { success: false, message: "Failed to generate title" };
            }

            // Use internal mutation to update titles
            await ctx.runMutation(internal.messages.updateChatAndNodeTitle, {
                chatId: args.chatId,
                title: generatedTitle,
            });

            return {
                success: true,
                title: generatedTitle
            };
        } catch (error) {
            console.error("Failed to generate chat name:", error);
            return { success: false, message: "Failed to generate title" };
        }
    },
});


// Type exports
export type ListMessagesByChatArgs = Infer<typeof listMessagesByChatArgs>;
export type ClearMessagesArgs = Infer<typeof clearMessagesArgs>;
export type SendMessageArgs = Infer<typeof sendMessageArgs>;
export type GetChatHistoryArgs = Infer<typeof getChatHistoryArgs>;
export type GetStreamBodyArgs = Infer<typeof getStreamBodyArgs>;
export type GenerateChatNameActionArgs = Infer<typeof generateChatNameActionArgs>;
export type GetConnectedNodeContextArgs = Infer<typeof getConnectedNodeContextArgs>;
// Note: streamChat is an httpAction, not a mutation/query, so we don't export types for it
