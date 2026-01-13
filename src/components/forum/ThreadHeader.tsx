"use client";

import { ForumThread } from "@/types/forum";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, Clock, Pin, Lock, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ThreadHeaderProps {
    thread: ForumThread;
}

export function ThreadHeader({ thread }: ThreadHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={cn(
                        "rounded-full px-4 py-1 border-none",
                        thread.category?.color === 'purple' && "bg-purple-500/10 text-purple-400",
                        thread.category?.color === 'blue' && "bg-blue-500/10 text-blue-400",
                        thread.category?.color === 'green' && "bg-green-500/10 text-green-400",
                        thread.category?.color === 'red' && "bg-red-500/10 text-red-400",
                        thread.category?.color === 'yellow' && "bg-yellow-500/10 text-yellow-400",
                        thread.category?.color === 'orange' && "bg-orange-500/10 text-orange-400",
                    )}>
                        {thread.category?.name}
                    </Badge>
                    {thread.is_pinned && (
                        <Badge className="bg-primary/20 text-primary border-primary/20 gap-1 rounded-full px-3 py-1">
                            <Pin className="w-3 h-3 fill-primary" /> Pinned
                        </Badge>
                    )}
                    {thread.is_locked && (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1 rounded-full px-3 py-1">
                            <Lock className="w-3 h-3" /> Locked
                        </Badge>
                    )}
                </div>

                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                        {thread.title}
                    </h1>
                    <button className="hidden md:flex p-3 rounded-2xl bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-secondary transition-all">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-6 border-y border-border/40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden">
                        {thread.author?.avatar_url ? (
                            <img src={thread.author.avatar_url} alt={thread.author.display_name || ""} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold uppercase">
                                {thread.author?.display_name?.[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground leading-none mb-1">
                            {thread.author?.display_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            {thread.author?.karma_tier}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8 ml-auto">
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-black">{thread.reply_count || 0}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                            <MessageSquare className="w-3 h-3" />
                            <span>Replies</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-black">{thread.view_count || 0}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                            <Eye className="w-3 h-3" />
                            <span>Views</span>
                        </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-sm font-bold text-foreground">
                            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                            <Clock className="w-3 h-3" />
                            <span>Published</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
