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
import { createNodeContext } from "./messageHelpers";
import { AssistantMode, prompt } from "./utils/context";

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

const deleteMessagesAfterArgs = v.object({
    chatId: v.id("chats"),
    afterMessageId: v.id("messages"),
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

        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            return { page: [], isDone: true, continueCursor: "" };
        }

        if (chat.userId !== identity.userId.toString()) {
            throw new Error("Unauthorized: You can only access your own chats");
        }

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

        // Get the chat to find its workspace through the vision
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            throw new Error("Chat not found");
        }

        const vision = await ctx.db.get(chat.visionId);
        if (!vision) {
            throw new Error("Vision not found");
        }

        const plan = await getUserPlan(ctx, vision.workspace);
        requirePermission(plan, Permission.AI_NODES);

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

        if (isFirstMessage) {
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

    const chatId = request.headers.get("x-chat-id");
    const response = await persistentTextStreaming.stream(
        ctx,
        request,
        body.streamId as StreamId,
        async (ctx, _, __, append) => {
            const historyQuery = internal.messages.getChatHistory;
            const contextQuery = internal.messages.getConnectedNodeContext;
            const history = await ctx.runQuery(historyQuery, { chatId: chatId as Id<"chats"> });
            const nodeContext = await ctx.runQuery(contextQuery, { chatId: chatId as Id<"chats"> });

            const youtubeTranscripts = await fetchYoutubeTranscripts(nodeContext);

            const contextArray: string[] = [];
            const mediaContent: any[] = [];

            nodeContext.connectedNodes.forEach((node: any) => {
                const transcript = youtubeTranscripts.find(t => t.value === node.value)?.transcript;

                const nodeContextOutput = createNodeContext(
                    {
                        title: node.title,
                        value: node.value,
                        type: node.type,
                        ogMetadata: node.ogMetadata
                    },
                    {
                        transcript,
                        contextText: node.thought
                    }
                );

                contextArray.push(nodeContextOutput.context);

                if (nodeContextOutput.media) {
                    mediaContent.push(nodeContextOutput.media);
                }
            });

            const lastUserMessage = history.length > 0 ? history[history.length - 1]?.content || "" : "";

            const contextDescription = contextArray.length > 0
                ? `Additional context from ${contextArray.length} connected node(s) in the visual workspace`
                : "Connected workspace nodes";

            const stream = await prompt(
                AssistantMode.General,
                lastUserMessage,
                {
                    description: contextDescription,
                    data: contextArray,
                    media: mediaContent
                },
                history
            );

            for await (const part of stream)
                await append(part.choices[0]?.delta?.content || "");
        }
    );

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Vary", "Origin");

    return response;
});

export const updateChatAndNodeTitle = internalMutation({
    args: v.object({
        chatId: v.id("chats"),
        title: v.string(),
    }),
    handler: async (ctx, args) => {
        const chat = await ctx.db.get(args.chatId);

        await ctx.db.patch(args.chatId, {
            title: args.title,
        });

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

export const getConnectedNodeContext = internalQuery({
    args: getConnectedNodeContextArgs,
    handler: async (ctx, args) => {
        const chat = await ctx.db.get(args.chatId);
        if (!chat) {
            return { connectedNodes: [], contextText: "" };

        }

        const nodeId = chat.nodeId;

        if (!nodeId) {
            return { connectedNodes: [], contextText: "" };
        }

        const framedNode = await ctx.db.query("framed_node").withIndex("nodeId", (q) => q.eq("node.data", nodeId)).first();
        if (!framedNode || !framedNode.node.id) {
            return { connectedNodes: [], contextText: "" };
        }

        const edges = await ctx.db
            .query("edges")
            .withIndex("target", (q) => q.eq("target", framedNode._id))
            .collect();

        if (edges.length === 0) {
            return { connectedNodes: [], contextText: "" };
        }

        const sourceNodeIds = edges.map(edge => edge.source);

        const sourceFramedNodes = await Promise.all(
            sourceNodeIds.map(async (nodeId) => {
                return await ctx.db.get(nodeId)
            })
        );

        const validSourceFramedNodes = sourceFramedNodes.filter(fn => fn !== null);

        const connectedNodeData = await Promise.all(
            validSourceFramedNodes.map(async (framedNode) => {
                const nodeData = await ctx.db.get(framedNode.node.data);
                return { framedNode, nodeData };
            })
        );

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

        const mediaNodesWithMetadata = await Promise.all(
            relevantNodes
                .filter(node => node.type !== "Text")
                .map(async (node) => {
                    try {
                        const ogData = await ctx.db
                            .query("og_metadata")
                            .withIndex("by_url", (q) => q.eq("url", node.value))
                            .first();

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

        const textNodes = relevantNodes.filter(node => node.type === "Text");
        const allNodesWithMetadata = [
            ...textNodes.map(node => ({ ...node, ogMetadata: null })),
            ...mediaNodesWithMetadata
        ];

        let contextText = "";
        if (allNodesWithMetadata.length > 0) {
            contextText = "CONNECTED NODE CONTEXT:\n\n";
            allNodesWithMetadata.forEach(node => {
                contextText += `--- ${node.title} (${node.type}) ---\n`;

                if (node.type === "Text") {
                    contextText += `Content: ${node.value}\n`;
                    if (node.thought && node.thought.trim().length > 0) {
                        contextText += `Thought: ${node.thought}\n`;
                    }
                    contextText += "\n";
                } else {
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


export const deleteMessagesAfter = mutation({
    args: deleteMessagesAfterArgs,
    handler: async (ctx, args) => {
        const identity = await requireAuth(ctx);

        if (!identity?.userId) {
            throw new Error("Failed to get the user Id");
        }

        // Get all messages in the chat - order by desc to get newest first
        const allMessages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .order("desc")
            .collect();

        console.log('[deleteMessagesAfter] ===== ALL MESSAGES =====');
        allMessages.forEach((m, i) => {
            console.log(`[${i}]`, m.role, '|', m._id, '|', m.content?.substring(0, 30));
        });
        console.log('[deleteMessagesAfter] ========================');

        // Find the target message - this is the USER message that we want to retry
        // The AI response is streamed content associated with this message, not a separate message
        const targetIndex = allMessages.findIndex(m => m._id === args.afterMessageId);
        if (targetIndex === -1) {
            throw new Error("Message not found");
        }

        const targetMessage = allMessages[targetIndex];

        console.log('[deleteMessagesAfter] Target index:', targetIndex);
        console.log('[deleteMessagesAfter] Target message role:', targetMessage?.role);
        console.log('[deleteMessagesAfter] Target message content:', targetMessage?.content?.substring(0, 50));

        // IMPORTANT: Each message record is a USER prompt with an associated AI response (via streamId)
        // When clicking retry on an AI response, we're passing the message ID of the USER prompt
        //
        // In allMessages array (reverse chronological - newest first):
        // [0] User: "latest question" (newest)
        // [1] User: "previous question"
        // [2] User: "question to retry" (TARGET - delete this and resend with same content)
        // [3] User: "older question" (keep)
        //
        // We need to:
        // 1. Delete the target message AND all messages newer than it (indices 0 to targetIndex inclusive)
        // 2. Return the target's content so it can be resent as a NEW message

        // Delete the target message AND all messages newer than it
        const messagesToDelete = allMessages.slice(0, targetIndex + 1);

        console.log('[deleteMessagesAfter] Messages to delete:', messagesToDelete.length);
        console.log('[deleteMessagesAfter] Deleting indices 0 to', targetIndex, '(inclusive)');
        console.log('[deleteMessagesAfter] Target message will be deleted and resent:', targetMessage._id);

        // Delete the newer messages
        for (const message of messagesToDelete) {
            console.log('[deleteMessagesAfter] Deleting message:', message._id, 'role:', message.role, 'content:', message.content?.substring(0, 30));
            await ctx.db.delete(message._id);
        }

        return {
            deletedCount: messagesToDelete.length,
            userPromptContent: targetMessage.content || null,
        };
    },
});

export type ListMessagesByChatArgs = Infer<typeof listMessagesByChatArgs>;
export type ClearMessagesArgs = Infer<typeof clearMessagesArgs>;
export type SendMessageArgs = Infer<typeof sendMessageArgs>;
export type GetChatHistoryArgs = Infer<typeof getChatHistoryArgs>;
export type GetStreamBodyArgs = Infer<typeof getStreamBodyArgs>;
export type GenerateChatNameActionArgs = Infer<typeof generateChatNameActionArgs>;
export type GetConnectedNodeContextArgs = Infer<typeof getConnectedNodeContextArgs>;
export type DeleteMessagesAfterArgs = Infer<typeof deleteMessagesAfterArgs>;
