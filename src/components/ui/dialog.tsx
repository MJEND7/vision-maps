"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextType {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined)

const useDialogContext = () => {
    const context = React.useContext(DialogContext)
    if (!context) {
        throw new Error("Dialog components must be used within Dialog")
    }
    return context
}

const Dialog = ({
    children,
    open,
    onOpenChange
}: {
    children: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
}) => (
    <DialogContext.Provider value={{ open, onOpenChange }}>
        {children}
    </DialogContext.Provider>
)

const DialogTrigger = ({
    children,
    asChild,
    ...props
}: {
    children: React.ReactNode
    asChild?: boolean
} & React.HTMLAttributes<HTMLElement>) => {
    const { onOpenChange } = useDialogContext()

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
            ...props,
            //@ts-ignore
            onClick: (e: React.MouseEvent) => {
                onOpenChange(true)
                //@ts-ignore
                if (children.props.onClick) {
                    //@ts-ignore
                    children.props.onClick(e)
                }
            }
        })
    }

    return (
        <button {...props} onClick={() => onOpenChange(true)}>
            {children}
        </button>
    )
}

const DialogContent = ({
    children
}: { children: React.ReactNode }) => {
    const { open, onOpenChange } = useDialogContext()

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="fixed inset-0 bg-black/80"
                onClick={() => onOpenChange(false)}
            />
            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
                {children}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    )
}

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)

const DialogTitle = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
)

const DialogDescription = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
)

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
