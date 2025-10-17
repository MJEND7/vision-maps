import { motion } from "motion/react";

interface SkeletonCardProps {
    className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
    return (
        <motion.div
            className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Image Skeleton */}
            <div className="h-40 w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
            
            {/* Content Section */}
            <div className="p-4 space-y-2">
                {/* Header with Icon & Title */}
                <div className="flex items-center gap-3">
                    {/* Platform Icon Skeleton */}
                    <div className="flex-shrink-0">
                        <div className="w-5 h-5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        {/* Title Skeleton */}
                        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
                        {/* Author Skeleton */}
                        <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-2/3 animate-pulse" />
                    </div>
                </div>

                {/* Description Skeleton */}
                <div className="space-y-1">
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-4/5 animate-pulse" />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                    {/* Date Skeleton */}
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-pulse" />
                    {/* Link Skeleton */}
                    <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-20 animate-pulse" />
                </div>
            </div>
        </motion.div>
    );
}