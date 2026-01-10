import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    )
}

function SkeletonCard() {
    return (
        <div className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="px-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    )
}

function SkeletonCardGrid({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}

export { Skeleton, SkeletonCard, SkeletonCardGrid }
