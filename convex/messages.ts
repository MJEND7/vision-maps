import { query, mutation, httpAction, internalQuery } from "./_generated/server";
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
    paginationOpts:  paginationOptsValidator

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
            throw new Error("Chat not found");
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

        const streamId = await persistentTextStreaming.createStream(ctx);
        const messageId = await ctx.db.insert("messages", {
            chatId: args.chatId,
            content: args.content,
            userId: identity.userId?.toString(),
            role: "user",
            streamId: streamId.toString(),
        });
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

            const openai = new OpenAI()
            // Lets kickoff a stream request to OpenAI
            const stream = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant that can answer questions and help with tasks.
          Please provide your response in markdown format.
          
          You are continuing a conversation. The conversation so far is found in the following JSON-formatted value:`,
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

// Type exports
export type ListMessagesByChatArgs = Infer<typeof listMessagesByChatArgs>;
export type ClearMessagesArgs = Infer<typeof clearMessagesArgs>;
export type SendMessageArgs = Infer<typeof sendMessageArgs>;
export type GetChatHistoryArgs = Infer<typeof getChatHistoryArgs>;
export type GetStreamBodyArgs = Infer<typeof getStreamBodyArgs>;

// Note: streamChat is an httpAction, not a mutation/query, so we don't export types for it
