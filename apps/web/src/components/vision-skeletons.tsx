import { Skeleton } from "@/components/ui/skeleton";

export function VisionTableSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
                <div
                    key={i}
                    className="w-full shadow-lg rounded-xl border bg-card"
                >
                    <div className="flex flex-row">
                        <div className="relative flex w-[100px] sm:h-[100px] sm:w-[250px] items-center justify-center">
                            <div className="absolute left-2 top-2">
                                <div className='rounded-sm text-white bg-accent p-2 sm:p-3' />
                            </div>
                            <Skeleton className="h-3 sm:h-6 w-20" />
                        </div>
                        <div className="flex-1 flex flex-col gap-2 bg-accent rounded-none rounded-r-xl px-3 py-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-32" />
                                <div className="flex items-center gap-2">
                                    <FacePileSkeleton />
                                    <div className="hidden sm:flex items-center gap-1">
                                        <Skeleton className="bg-card h-6 w-6 rounded" />
                                        <Skeleton className="bg-card h-6 w-6 rounded" />
                                        <Skeleton className="bg-card h-6 w-6 rounded" />
                                    </div>
                                    <div className="sm:hidden">
                                        <Skeleton className="bg-card h-6 w-6 rounded" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-left space-y-1">
                                <Skeleton className="bg-card h-3 w-3/4" />
                                <Skeleton className="bg-card h-3 w-24" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function VisionGridSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
                <div
                    key={i}
                    className="shadow-lg flex flex-col justify-between rounded-3xl border"
                >
                    <div className="group relative flex h-[200px] items-center justify-center rounded-3xl">
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <hr />
                    <div className="flex gap-3 items-start bg-accent rounded-b-3xl space-y-1 px-3 py-2 text-left text-xs">
                        <div className='rounded-sm text-white bg-card p-3' />
                        <div className="w-full">
                            <div className="flex justify-between items-start">
                                <div className='w-full space-y-2'>
                                    <Skeleton className="bg-card h-4 w-24" />
                                    <Skeleton className="bg-card h-3 w-32" />
                                </div>
                                <Skeleton className="h-6 w-6 rounded" />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <Skeleton className="bg-card h-3 w-20" />
                                <FacePileSkeleton />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function FacePileSkeleton() {
    return (
        <div className="flex -space-x-2">
            {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="bg-card sm:w-7 sm:h-7 h-5 w-5 rounded-full border border-accent" />
            ))}
        </div>
    );
}

export function RoutingIndicator() {
    return (
        <div className="h-screen max-w-7xl space-y-5 mx-auto p-4 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Opening your vision</span>
                    <svg
                        className="w-4 h-4 animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

export function VisionTitleSkeleton({ className }: { className?: string }) {
    return (
        <div className={`w-full space-y-2 pb-2 pt-4 px-4 ${className || ''}`}>
            <div className="w-full flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-4" />
            </div>
            <div className="space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-60" />
            </div>
        </div>
    );
}

export function DraggableSidebarSkeleton() {
    return (
        <div className="px-3 w-full space-y-4">
            <div className="w-full flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                    <ChannelSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

function ChannelSkeleton() {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-md">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-4" />
            </div>
            {/* Frame skeletons */}
            <div className="ml-6 space-y-1">
                {Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => (
                    <div key={i} className="flex items-center gap-2 p-1 rounded-sm">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}
