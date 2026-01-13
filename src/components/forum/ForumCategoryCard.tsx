"use client";

import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";
import { ForumCategory } from "@/types/forum";
import { cn } from "@/lib/utils";

interface ForumCategoryCardProps {
    category: ForumCategory;
}

const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
    orange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export function ForumCategoryCard({ category }: ForumCategoryCardProps) {
    const colorClass = colorMap[category.color || "blue"] || colorMap.blue;

    return (
        <Link href={`/forums/${category.slug}`}>
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:bg-secondary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer h-full">
                {/* Visual Accent */}
                <div className={cn("absolute top-0 left-0 w-1 h-full", colorClass.split(" ")[0].replace("text", "bg"))} />

                <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                        <div className={cn("p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", colorClass)}>
                            <span className="text-2xl">{category.icon || "💬"}</span>
                        </div>
                        <div className="p-2 rounded-full bg-secondary/50 text-muted-foreground group-hover:text-primary transition-colors">
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight">
                            {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                            {category.description}
                        </p>
                    </div>

                    <div className="pt-4 flex items-center gap-6 border-t border-border/40">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <MessageSquare className="w-4 h-4" />
                            <span>{category.thread_count || 0} Discussions</span>
                        </div>
                    </div>
                </div>

                {/* Decorative background element */}
                <div className={cn(
                    "absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity duration-700",
                    colorClass.split(" ")[0].replace("text", "bg")
                )} />
            </div>
        </Link>
    );
}
