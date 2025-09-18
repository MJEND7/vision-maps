"use client";

import { NotionSidebar } from "./notion-sidebar";
import { Skeleton } from "./skeleton";

export function OrgSwitchSkeleton() {
    return (
        <div className="flex h-screen bg-background">
            <NotionSidebar />
            
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl space-y-5 mx-auto px-4 pb-8 pt-8">
                    {/* Header skeleton */}
                    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-4 w-96" />
                            </div>
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>

                    {/* Controls skeleton */}
                    <div className="sm:w-auto sm:items-center sm:justify-end w-full flex gap-2">
                        <Skeleton className="h-10 w-full sm:w-[300px]" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-10" />
                    </div>

                    {/* Content skeleton - grid layout */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="rounded-3xl border bg-card overflow-hidden"
                            >
                                {/* Image skeleton */}
                                <Skeleton className="h-[200px] w-full rounded-t-3xl rounded-b-none" />
                                
                                {/* Content skeleton */}
                                <div className="p-3 space-y-2">
                                    <div className="flex items-start gap-3">
                                        <Skeleton className="w-8 h-8 rounded-md" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-3/4" />
                                            <div className="flex items-center justify-between">
                                                <Skeleton className="h-3 w-20" />
                                                <div className="flex items-center gap-1">
                                                    <Skeleton className="w-6 h-6 rounded-full" />
                                                    <Skeleton className="w-6 h-6 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Loading message */}
                    <div className="text-center py-8">
                        <div className="flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <p className="text-muted-foreground">Switching organization...</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
