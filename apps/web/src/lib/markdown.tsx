import React, { useMemo } from 'react';
import { useTheme } from "next-themes";
import { Check, ExternalLink } from 'lucide-react';
import { Components } from "react-markdown";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Code component with copy functionality for text nodes
const CodeComponent = ({ className, children, ...props }: any) => {
    const [copied, setCopied] = React.useState(false);
    const { theme: currentTheme } = useTheme();
    const match = /language-(\w+)/.exec(className || "");

    // Memoize theme to prevent recalculation on every render
    const theme = useMemo(() => {
        return currentTheme === "dark" ? oneDark : oneLight;
    }, [currentTheme]);

    const codeString = String(children).replace(/\n$/, "");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code:", err);
        }
    };

    return match ? (
        <div className="max-w-full relative group my-3">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 text-xs rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                {copied ? <Check size={12} /> : <ExternalLink size={12} />}
            </button>
            <SyntaxHighlighter
                style={theme as SyntaxHighlighterProps["style"]}
                language={match[1]}
                PreTag="div"
                className="rounded-md border text-xs"
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    ) : (
        <code
            className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-card-foreground"
            {...props}
        >
            {children}
        </code>
    );
};

// Custom Markdown styles for text nodes (much smaller text)
export const MARKDOWN_COMPONENTS: Components = {
    h1: ({ ...props }) => (
        <h1 className="text-md font-bold text-card-foreground pb-3" {...props} />
    ),
    h2: ({ ...props }) => (
        <h2 className="text-md font-semibold text-card-foreground pb-3" {...props} />
    ),
    h3: ({ ...props }) => (
        <h2 className="text-xs font-semibold text-card-foreground pb-3" {...props} />
    ),
    th: ({ ...props }) => (
        <th className="whitespace-nowrap text-sm list-disc list-inside space-y-0.5 font-semibold text-card-foreground pb-2" {...props} />
    ),
    td: ({ ...props }) => (
        <td className="text-sm list-disc list-inside space-y-0.5 text-card-foreground pb-2" {...props} />
    ),
    p: ({ ...props }) => (
        <p className="text-sm text-card-foreground leading-tight pb-2" {...props} />
    ),
    a: ({ ...props }) => (
        <a className="text-sm text-blue-600 hover:underline leading-tight pb-2" {...props} />
    ),
    ul: ({ ...props }) => (
        <ul className="list-disc list-inside space-y-0.5 text-card-foreground text-xs" {...props} />
    ),
    ol: ({ ...props }) => (
        <ol className="list-decimal list-inside space-y-0.5 text-card-foreground text-xs" {...props} />
    ),
    li: ({ ...props }) => (
        <li className="ml-1 text-sm text-card-foreground leading-tight pb-2" {...props} />
    ),
    blockquote: ({ ...props }) => (
        <blockquote
            className="mb-2 border-l-2 border-border pl-1 italic text-muted-foreground text-xs"
            {...props}
        />
    ),
    code: CodeComponent,
};
