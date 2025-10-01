import OpenAI from "openai";
import { NodeVariants } from "../nodes/table";
import { Id } from "../_generated/dataModel";

export enum AssistantMode {
    General = `Role: You are a helpful assistant that can answer questions and help with tasks.
            Please provide your response in markdown format. You are continuing a conversation.
            The conversation so far is found in the following JSON-formatted value:`,
}

// Markdown types
enum RowType {
    EMPTY = "",

    // Headings
    H1 = "#",
    H2 = "##",
    H3 = "###",

    // Text styles
    BOLD = "**",
    ITALIC = "*",
    STRIKETHROUGH = "~~",
    INLINE_CODE = "`",
    CODE_BLOCK = "```",

    // Lists
    UNORDERED_LIST = "-",
    ORDERED_LIST = "1.",

    // Block elements
    BLOCKQUOTE = ">",
    HORIZONTAL_RULE = "---",
}

class State {
    private state = "";

    constructor(mode: AssistantMode) {
        this.row(mode, RowType.BLOCKQUOTE, 0, 4);
    }

    private gap(gap: number) {
        for (let i = 0; i < gap; i++) {
            this.state += "|";
        }
    }

    private insert(str: string, rowType: RowType) {
        let insert = "";

        switch (rowType) {
            case RowType.H1:
            case RowType.H2:
            case RowType.H3:
            case RowType.BLOCKQUOTE:
            case RowType.UNORDERED_LIST:
            case RowType.ORDERED_LIST:
                // Prefix-based row types
                insert = `${rowType} ${str}`;
                break;

            case RowType.BOLD:
                insert = `${RowType.BOLD}${str}${RowType.BOLD}`;
                break;

            case RowType.ITALIC:
                insert = `${RowType.ITALIC}${str}${RowType.ITALIC}`;
                break;

            case RowType.STRIKETHROUGH:
                insert = `${RowType.STRIKETHROUGH}${str}${RowType.STRIKETHROUGH}`;
                break;

            case RowType.INLINE_CODE:
                insert = `${RowType.INLINE_CODE}${str}${RowType.INLINE_CODE}`;
                break;

            case RowType.CODE_BLOCK:
                insert = `${RowType.CODE_BLOCK}${str}${RowType.CODE_BLOCK}`;
                break;

            case RowType.HORIZONTAL_RULE:
                insert = `${RowType.HORIZONTAL_RULE}`;
                break;

            case RowType.EMPTY:
            default:
                insert = str;
        }

        this.state += insert;
    }

    private clear(str: string) {
        return str.replace(" ", "").replace("\n", "")
    }

    public row(
        str: string,
        rowType: RowType = RowType.EMPTY,
        startGap = 2,
        endGap = 2
    ) {
        this.gap(startGap);
        this.insert(this.clear(str), rowType);
        this.gap(endGap);
    }

    toString() {
        return this.state;
    }
}

type PromptOptions = {
    title: string;
    command: string;
    notes?: string[];
    metaData?: { [key: string]: string }
};

export type Context = string;

export const edge_context = (mode: AssistantMode, nodeVariant: NodeVariants, { title, command, notes, metaData }: PromptOptions): Context => {
    const state = new State(mode);

    state.row(title, RowType.H1);
    state.row(`Node Variant: ${nodeVariant}`, RowType.H2);
    state.row(command, RowType.EMPTY);

    if (notes) {
        notes.forEach((n) => state.row(n, RowType.ORDERED_LIST, 0, 0));
    }

    state.row("\n", RowType.EMPTY);

    if (metaData) {
        for (const [k, v] of Object.entries(metaData)) {
            state.row(`${k}: ${v}`, RowType.UNORDERED_LIST, 0, 0)
        }
    }

    return state.toString() as Context
};

export const prompt = async (
    mode: AssistantMode,
    message: string,
    context: { description: string, data: Context[], media: any[] },
    history: ({
        role: "user";
        content: string;
        _id: Id<"messages">;
    } | {
        role: "assistant";
        content: string;
    })[]) => {
    const messages: any[] = [
        {
            role: "system",
            content: mode
        },
        ...history
    ];

    // Build the final user message with context and media
    if (context.data.length > 0 || context.media.length > 0) {
        // Build context text from all the markdown context data
        const contextText = context.data.length > 0
            ? `\n\n${context.description}:\n\n${context.data.join("\n\n")}`
            : "";

        // If there's media, use array content format
        if (context.media.length > 0) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: message + contextText },
                    ...context.media
                ]
            });
        } else {
            // No media, just text
            messages.push({
                role: "user",
                content: message + contextText
            });
        }
    } else {
        // No context or media, just the message
        messages.push({
            role: "user",
            content: message
        });
    }

    const openai = new OpenAI()

    return await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        stream: true,
    });
}
