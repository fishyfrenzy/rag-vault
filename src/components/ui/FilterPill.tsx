"use client";

import { cn } from "@/lib/utils";

interface FilterPillProps {
    children: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    className?: string;
    size?: "sm" | "md";
}

export function FilterPill({
    children,
    active = false,
    onClick,
    className,
    size = "md"
}: FilterPillProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "shrink-0 rounded-full font-medium transition-all duration-200",
                "border border-border/50 hover:border-primary/50",
                size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm",
                active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/50 text-foreground hover:bg-secondary",
                className
            )}
        >
            {children}
        </button>
    );
}

interface QuickFilterProps {
    label: string;
    icon?: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
}

export function QuickFilter({ label, icon, active, onClick }: QuickFilterProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                "border",
                active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground"
            )}
        >
            {icon}
            {label}
        </button>
    );
}
