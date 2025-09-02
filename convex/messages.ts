import { query, mutation, httpAction, internalQuery } from "./_generated/server";
import { PersistentTextStreaming, StreamId } from "@convex-dev/persistent-text-streaming";
import { v } from "convex/values";
import { requireAuth } from "./utils/auth";
import { components, internal } from "./_generated/api";
import { PaginationOptions } from "convex/server";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

export const persistentTextStreaming = new PersistentTextStreaming(
    components.persistentTextStreaming
);

export const listMessagesByChat = query({
    args: {
        chatId: v.id("chats"),
        cursor: v.optional(v.string()),
        numItems: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const numItems = args.numItems ?? 50;

        const query = ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .order("desc");

        const paginationOpts: PaginationOptions = {
            numItems,
            cursor: args.cursor || null
        };

        return await query.paginate(paginationOpts);
    },
});

export const clearMessages = mutation({
    args: {
        chatId: v.id("chats")
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .collect();
        await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
    },
});

export const sendMessage = mutation({
    args: {
        chatId: v.id("chats"),
        content: v.string(),
    },
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
    args: {
        chatId: v.id("chats")
    },
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
    args: {
        streamId: v.string(),
    },
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
