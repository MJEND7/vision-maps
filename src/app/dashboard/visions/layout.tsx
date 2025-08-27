"use client";

import { motion } from 'motion/react';
import { VisionTableSkeleton, VisionGridSkeleton } from '@/components/vision-skeletons';
import { Grid3X3, List, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@clerk/nextjs';

export default function VisionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoaded } = useUser();
    const LOCAL_VIEW_MODE = "visions-view-mode";
    const viewMode = localStorage.getItem(LOCAL_VIEW_MODE) || "grid";


    if (!isLoaded) {
        return (
            <main className="max-w-7xl space-y-5 mx-auto p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-lg p-4 sm:p-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                </motion.div>

                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex w-full gap-2 items-center">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-8 w-32" />
                    </div>

                    <div className="sm:w-auto w-full flex gap-2">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                            <Input
                                type="text"
                                placeholder="Search visions..."
                                disabled
                                className="pl-8 h-[32px] placeholder:text-xs text-sm rounded-md opacity-50"
                            />
                        </div>
                        <div className="flex items-center border border-border h-[32px] rounded-md">
                            <button
                                disabled
                                className={`h-full w-10 flex items-center justify-center rounded-l-sm transition-colors ${viewMode === "grid"
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent/50"
                                    }`}
                            >
                                <Grid3X3 size={16} />
                            </button>
                            <button
                                disabled
                                className={`h-full w-10 flex items-center justify-center rounded-r-sm transition-colors ${viewMode === "table"
                                    ? "bg-accent text-accent-foreground"
                                    : "hover:bg-accent/50"
                                    }`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === "grid" ? <VisionGridSkeleton /> : <VisionTableSkeleton />}
            </main>
        );
    }

    return <>{children}</>;
}
