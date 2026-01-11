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

function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4"
                    style={{ width: `${100 - i * 15}%` }}
                />
            ))}
        </div>
    )
}

function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizeClasses = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
    return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

function SkeletonButton() {
    return <Skeleton className="h-10 w-24 rounded-md" />;
}

function SkeletonProfileHeader() {
    return (
        <div className="flex items-center gap-4 p-4">
            <SkeletonAvatar size="lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
    );
}

export {
    Skeleton,
    SkeletonCard,
    SkeletonCardGrid,
    SkeletonText,
    SkeletonAvatar,
    SkeletonButton,
    SkeletonProfileHeader
}

