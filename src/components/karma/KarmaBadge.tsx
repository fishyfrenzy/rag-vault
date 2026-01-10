"use client";

import { KARMA_TIERS, KarmaTier, getKarmaToNextTier } from "@/lib/karma";
import { cn } from "@/lib/utils";

interface KarmaBadgeProps {
    tier: KarmaTier;
    karma?: number;
    showProgress?: boolean;
    size?: "sm" | "md" | "lg";
}

export function KarmaBadge({ tier, karma, showProgress = false, size = "md" }: KarmaBadgeProps) {
    const tierInfo = KARMA_TIERS[tier] || KARMA_TIERS.newcomer;
    const toNext = karma !== undefined ? getKarmaToNextTier(karma) : null;

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
    };

    return (
        <div className="inline-flex flex-col items-center gap-1">
            <div
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border",
                    sizeClasses[size]
                )}
            >
                <span>{tierInfo.icon}</span>
                <span className={cn("font-medium", tierInfo.color)}>{tierInfo.label}</span>
                {karma !== undefined && (
                    <span className="text-muted-foreground">({karma.toLocaleString()})</span>
                )}
            </div>

            {showProgress && toNext !== null && (
                <span className="text-xs text-muted-foreground">
                    {toNext.toLocaleString()} to next tier
                </span>
            )}
        </div>
    );
}
