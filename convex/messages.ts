import { query, mutation, httpAction, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { PersistentTextStreaming, StreamId } from "@convex-dev/persistent-text-streaming";
import { v, Infer } from "convex/values";
import { requireAuth } from "./utils/auth";
import { components, internal } from "./_generated/api";
import { PaginationOptions, paginationOptsValidator } from "convex/server";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

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
            // Lets grab the history up to now so that the AI has some context
            const history = await ctx.runQuery(internal.messages.getChatHistory, { chatId: chatId as Id<"chats"> });

            // Get connected node context for additional AI context
            const nodeContext = await ctx.runQuery(internal.messages.getConnectedNodeContext, { chatId: chatId as Id<"chats"> });

            const openai = new OpenAI()

            // Build system message with connected node context
            let systemContent = `You are a helpful assistant that can answer questions and help with tasks.
Please provide your response in markdown format.

You are continuing a conversation. The conversation so far is found in the following JSON-formatted value:`;

            // Add connected node context if available
            if (nodeContext.contextText) {
                systemContent += `

IMPORTANT: Additional context from connected nodes in the visual workspace:

${nodeContext.contextText}

Use this connected node context to inform your responses when relevant. The connected nodes represent information that has been "piped" into your AI node through visual connections.`;
            }

            // Lets kickoff a stream request to OpenAI
            const stream = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: systemContent,
                    },
                    ...history,
                ],
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

        // Filter for Text and Link nodes only, and ensure they have valid data
        const relevantNodes = connectedNodeData
            .filter(({ nodeData }) =>
                nodeData &&
                (nodeData.variant === "Text" || nodeData.variant === "Link") &&
                nodeData.value &&
                nodeData.value.trim().length > 0
            )
            .map(({ framedNode, nodeData }) => ({
                id: framedNode.node.id,
                type: nodeData!.variant,
                title: nodeData!.title || `${nodeData!.variant} Node`,
                value: nodeData!.value
            }));

        // Create context text from connected nodes
        let contextText = "";
        if (relevantNodes.length > 0) {
            contextText = "CONNECTED NODE CONTEXT:\n\n";
            relevantNodes.forEach(node => {
                contextText += `--- ${node.title} (${node.type}) ---\n`;
                contextText += `${node.value}\n\n`;
            });
            contextText += "END CONNECTED NODE CONTEXT\n\n";
        }

        return {
            connectedNodes: relevantNodes,
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
