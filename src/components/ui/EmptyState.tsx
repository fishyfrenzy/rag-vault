"use client";

import { cn } from "@/lib/utils";
import { ImageIcon, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-4 text-center",
            className
        )}>
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {icon || <Inbox className="w-8 h-8 text-muted-foreground/50" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
            )}
            {action && (
                action.href ? (
                    <Button variant="outline" asChild>
                        <Link href={action.href}>{action.label}</Link>
                    </Button>
                ) : (
                    <Button variant="outline" onClick={action.onClick}>
                        {action.label}
                    </Button>
                )
            )}
        </div>
    );
}

export function NoResultsState({ query }: { query?: string }) {
    return (
        <EmptyState
            icon={<Search className="w-8 h-8 text-muted-foreground/50" />}
            title={query ? `No results for "${query}"` : "No items found"}
            description="Try adjusting your search or filters to find what you're looking for."
        />
    );
}

export function NoImageState() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="w-8 h-8 mb-1 opacity-30" />
            <span className="text-xs">No Image</span>
        </div>
    );
}
