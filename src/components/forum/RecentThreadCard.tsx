"use client";

import Link from "next/link";
import { MessageSquare, Clock } from "lucide-react";
import { ForumThread } from "@/types/forum";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RecentThreadCardProps {
    thread: ForumThread;
}

const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
};

export function RecentThreadCard({ thread }: RecentThreadCardProps) {
    const categoryColor = colorMap[thread.category?.color || "blue"] || colorMap.blue;

    return (
        <Link href={`/forums/${thread.category?.slug}/${thread.slug}`}>
            <div className="group flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card/50 hover:bg-secondary/30 hover:border-border transition-all duration-300">
                {/* Author Avatar */}
                <div className="w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
                    {thread.author?.avatar_url ? (
                        <img src={thread.author.avatar_url} alt={thread.author.display_name || ""} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold uppercase">
                            {thread.author?.display_name?.[0] || "?"}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", categoryColor)} />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
                            {thread.category?.name}
                        </span>
                    </div>

                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {thread.title}
                    </h4>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="font-medium">{thread.author?.display_name}</span>
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{thread.reply_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(thread.last_post_at), { addSuffix: true })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
