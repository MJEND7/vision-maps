import { useState } from "react";
import { Input } from "../ui/input";

export default function PasteBin() {
    const [link, setLink] = useState("");
    const [meta, setMeta] = useState<any>(null);

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text");
        setLink(pasted);

        // Simulate fetching metadata (replace with real API call)
        setTimeout(() => {
            setMeta({
                title: "Example Website",
                description: "This is a preview of the pasted link.",
                image: "https://via.placeholder.com/600x300",
            });
        }, 800);
    };

    return (
        <div className="absolute bottom-0 w-full max-w-lg mx-auto">
            <div className="relative">
                {/* Floating helper / metadata container */}
                <div
                    className={`
            absolute bottom-full mb-2 left-1/2 -translate-x-1/2
            flex items-end justify-center
            transition-all duration-500 ease-in-out
            ${meta ? "w-full h-56 opacity-100" : "w-40 h-8 opacity-80"}
          `}
                >
                    <div
                        className={`
              w-full h-full overflow-hidden rounded-xl shadow-md border
              bg-background transition-all duration-500 ease-in-out
              flex flex-col
              ${meta ? "p-0" : "p-1 items-center justify-center"}
            `}
                    >
                        {!meta ? (
                            <span className="text-[10px] text-muted-foreground font-medium flex items-center justify-center">
                                Press{" "}
                                <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">Ctrl</kbd> +{" "}
                                <kbd className="px-1 py-0.5 mx-1 bg-accent rounded">V</kbd> to
                                paste
                            </span>
                        ) : (
                            <div className="p-3">
                                {meta.image && (
                                    <img
                                        src={meta.image}
                                        alt={meta.title}
                                        className="w-full h-32 object-cover"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800">{meta.title}</h3>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {meta.description}
                                    </p>
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline mt-2 inline-block"
                                    >
                                        {link}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input at bottom */}
                <Input
                    className="h-11 transition-all ease-in-out duration-300 text-sm"
                    placeholder="Paste Media / Ctrl + V"
                    onPaste={handlePaste}
                />
            </div>
        </div>
    );
}
