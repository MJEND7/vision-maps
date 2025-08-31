import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  `inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap 
  rounded-lg text-primary text-sm transition-all disabled:pointer-events-none disabled:opacity-50
  [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 
  outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] 
  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden`,
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs transition-all duration-300 ease-in-out default-button-hover",
        destructive:
          "shadow-xs bg-red-500 text-white ease-in-out transition-all duration-300 hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.15)_30%,_transparent_60%)]",
        outline:
          "border bg-background backdrop-blur-[3px] shadow-xs hover:text-accent-foreground ease-in-out transition-all duration-300 hover:text-accent-foreground ease-in-out transition-all duration-300 hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(192,192,192,0.4)_0%,_rgba(192,192,192,0.2)_30%,_transparent_60%)] dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.15)_30%,_transparent_60%)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 transition-all duration-300 hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(192,192,192,0.4)_0%,_rgba(192,192,192,0.2)_30%,_transparent_60%)] dark:hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.15)_30%,_transparent_60%)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(192,192,192,0.4)_0%,_rgba(192,192,192,0.2)_30%,_transparent_60%)] dark:hover:bg-accent/50 dark:hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.15)_30%,_transparent_60%)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 py-2 has-[>svg]:px-2.5",
        lg: "h-10 rounded-full px-6 has-[>svg]:px-4",
        xl: "h-12 text-md rounded-full px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
