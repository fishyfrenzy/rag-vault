"use client";

import Link from "next/link";
import { MessageSquare, Eye, Pin, Lock, Clock } from "lucide-react";
import { ForumThread } from "@/types/forum";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ThreadListItemProps {
    thread: ForumThread;
    categorySlug: string;
}

export function ThreadListItem({ thread, categorySlug }: ThreadListItemProps) {
    return (
        <Link href={`/forums/${categorySlug}/${thread.slug}`}>
            <div className={cn(
                "group relative flex flex-col md:flex-row md:items-center gap-4 p-5 border-b border-border/60 hover:bg-secondary/20 transition-all duration-300",
                thread.is_pinned && "bg-primary/5 border-l-2 border-l-primary"
            )}>
                {/* Author Avatar (Mobile & Desktop) */}
                <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden">
                        {thread.author?.avatar_url ? (
                            <img src={thread.author.avatar_url} alt={thread.author.display_name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold uppercase">
                                {thread.author?.display_name?.[0] || "?"}
                            </div>
                        )}
                    </div>
                    <div className="md:hidden">
                        <p className="text-xs font-bold text-foreground">
                            {thread.author?.display_name || "Anonymous"}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {thread.author?.karma_tier || "newcomer"}
                        </p>
                    </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start gap-2">
                        {thread.is_pinned && <Pin className="w-4 h-4 text-primary fill-primary shrink-0 mt-1" />}
                        {thread.is_locked && <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {thread.title}
                        </h3>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{thread.author?.display_name || "Anonymous"}</span>
                        <span>•</span>
                        <span className="uppercase tracking-wider font-medium opacity-70">{thread.author?.karma_tier}</span>
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="flex items-center gap-4 md:gap-8 justify-between md:justify-end md:min-w-[180px]">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-bold">{thread.reply_count || 0}</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                <MessageSquare className="w-3 h-3" />
                                <span>Replies</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-bold">{thread.view_count || 0}</span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                <Eye className="w-3 h-3" />
                                <span>Views</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end min-w-[100px]">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(thread.last_post_at), { addSuffix: true })}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Last Activity</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
