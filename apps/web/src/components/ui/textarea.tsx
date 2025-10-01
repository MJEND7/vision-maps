import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    if (ref.current) {
      ref.current.style.height = "auto"; // reset so scrollHeight is correct
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    // Run once in case there's initial text
    handleInput();
  }, []);

  return (
    <textarea
      data-slot="textarea"
      ref={ref}
      onInput={handleInput}
      className={cn(
        "flex min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none border-accent placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
