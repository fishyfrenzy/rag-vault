import { Badge } from "@/components/ui/badge";
import { cn, formatYearRange } from "@/lib/utils";
import { CheckCircle, Calendar } from "lucide-react";
import type { VaultItemSummary } from "@/types/vault";

interface VaultItemListCardProps {
    item: VaultItemSummary;
    onClick?: () => void;
    className?: string;
}

export function VaultItemListCard({
    item,
    onClick,
    className
}: VaultItemListCardProps) {
    const isVerified = item.verification_count >= 3;
    const displayYear = formatYearRange(item.year_start, item.year_end);

    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex gap-4 p-3 rounded-xl cursor-pointer",
                "bg-card/50 border border-border/50",
                "hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200",
                className
            )}
        >
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary/50 shrink-0 relative">
                {item.reference_image_url ? (
                    <img
                        src={item.reference_image_url}
                        alt={item.subject}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground/20 font-bold">
                        {item.subject.charAt(0).toUpperCase()}
                    </div>
                )}
                {isVerified && (
                    <div className="absolute top-1 right-1 bg-green-500/90 text-white rounded-full p-0.5">
                        <CheckCircle className="w-3 h-3" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                    {item.title || item.subject}
                </h3>
                {item.brand && (
                    <p className="text-xs text-primary/80 font-medium uppercase tracking-wide truncate">
                        {item.brand}
                    </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] h-5 px-2">
                        {item.category}
                    </Badge>
                    {displayYear && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {displayYear}
                        </span>
                    )}
                    {item.tag_brand && (
                        <span className="text-xs text-muted-foreground truncate">
                            {item.tag_brand}
                        </span>
                    )}
                </div>
            </div>

            {/* Verification count */}
            <div className="flex flex-col items-center justify-center text-center shrink-0">
                <span className="text-lg font-bold text-foreground">{item.verification_count}</span>
                <span className="text-[10px] text-muted-foreground">verifies</span>
            </div>
        </div>
    );
}
