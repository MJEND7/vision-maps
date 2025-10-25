import * as React from "react"

import { cn } from "@/lib/utils"

interface Props extends React.ComponentProps<"input"> {
    ring?: boolean
}

function Input({ ring = true, className, type, ...props }: Props) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-accent flex h-10 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-base md:text-sm md:placeholder:text-sm",
        "text-base file:text-sm sm:text-xs sm:placeholder:text-xs",
        ring ? "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]" : "",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
