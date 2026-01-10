"use client";

import { Folder } from "lucide-react";
import { Plus } from "lucide-react";

interface CollectionCardProps {
    name: string;
    itemCount: number;
    color?: string;
    isPrivate?: boolean;
    onClick?: () => void;
    isEmpty?: boolean;
}

export function CollectionCard({
    name,
    itemCount,
    color = "#9333ea",
    isPrivate,
    onClick,
    isEmpty = false
}: CollectionCardProps) {
    if (isEmpty) {
        return (
            <button
                onClick={onClick}
                className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 aspect-square"
            >
                <div className="p-4 rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm">New Collection</span>
            </button>
        );
    }

    return (
        <div
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer aspect-square"
        >
            <div
                className="absolute top-0 left-0 w-full h-1.5"
                style={{ backgroundColor: color }}
            />

            <div className="p-5 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between">
                    <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: `${color}15`, color: color }}
                    >
                        <Folder className="w-6 h-6" />
                    </div>
                    {isPrivate && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            Private
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                        {name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                </div>
            </div>

            {/* Folder Decorative Notch */}
            <div
                className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: color }}
            />
        </div>
    );
}
