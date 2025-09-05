export function ChannelSkeleton() {
  return (
    <div className="h-full px-4 sm:px-6 md:px-12 lg:px-20 py-6 space-y-8 animate-pulse">
      {/* Title and description skeleton */}
      <div className="space-y-4">
        <div className="h-9 bg-muted rounded-lg w-2/3 sm:w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-3/4 sm:w-2/3" />
          <div className="h-4 bg-muted rounded w-2/3 sm:w-1/2" />
        </div>
        <hr className="border-muted" />

        {/* Controls skeleton */}
        <div className="flex flex-wrap gap-2">
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-28 sm:w-32" />
          <div className="flex-1 min-w-[100px]" />
          <div className="h-8 bg-muted rounded w-full sm:w-64" />
        </div>
      </div>

      {/* Nodes skeleton */}
      <div className="space-y-8">
        <NodeListSkeleton count={3} />
      </div>
    </div>
  )
}

interface NodeSkeletonProps {
  variant?: 'default' | 'compact'
}

export function NodeSkeleton({ variant = 'default' }: NodeSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3 p-4 rounded-lg">
      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-muted rounded-full" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-2 bg-muted rounded w-16" />
        </div>
        <div className="h-6 bg-muted rounded w-16" />
      </div>
      
      {/* Content */}
      {variant === 'default' ? (
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-4/5" />
          <div className="h-4 bg-muted rounded w-3/5" />
        </div>
      ) : (
        <div className="h-[200px] bg-muted rounded w-2/3" />
      )}
    </div>
  )
}

// components/skeletons/node-list-skeleton.tsx
interface NodeListSkeletonProps {
  count?: number
  showLoadMore?: boolean
}

export function NodeListSkeleton({ count = 5 }: NodeListSkeletonProps) {
  return (
    <div className="w-full max-w-lg space-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <NodeSkeleton 
          key={i} 
          variant={Math.random() > 0.7 ? 'compact' : 'default'} 
        />
      ))}
    </div>
  )
}
