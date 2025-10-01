"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-auto", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = "ScrollArea";