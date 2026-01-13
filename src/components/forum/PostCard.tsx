"use client";

import { ForumPost } from "@/types/forum";
import { VoteButtons } from "@/components/karma/VoteButtons";
import { formatDistanceToNow } from "date-fns";
import { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

interface PostCardProps {
    post: ForumPost;
    isOriginalPost?: boolean;
}

export function PostCard({ post, isOriginalPost = false }: PostCardProps) {
    const author = post.author;

    return (
        <div className={cn(
            "group relative flex gap-4 p-6 border border-border/60 rounded-2xl bg-card",
            isOriginalPost && "border-primary/20 bg-primary/5 shadow-lg shadow-primary/5"
        )}>
            {/* Sidebar with Author & Voting */}
            <div className="hidden md:flex flex-col items-center gap-4 w-24">
                <div className="w-16 h-16 rounded-2xl bg-secondary border border-border overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    {author?.avatar_url ? (
                        <img src={author.avatar_url} alt={author.display_name || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold uppercase">
                            {author?.display_name?.[0] || "?"}
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center">
                    <VoteButtons
                        targetType="forum_post"
                        targetId={post.id}
                        initialUpvotes={post.upvotes}
                        initialDownvotes={post.downvotes}
                    // Note: current user vote would be passed down from page
                    />
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="md:hidden w-8 h-8 rounded-lg bg-secondary border border-border overflow-hidden">
                            {author?.avatar_url ? (
                                <img src={author.avatar_url} alt={author.display_name || "User"} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold uppercase">
                                    {author?.display_name?.[0] || "?"}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-base">{author?.display_name || "Anonymous"}</span>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                                    author?.karma_tier === 'curator' ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    {author?.karma_tier}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                {post.is_edited && <span className="ml-2 italic">(edited)</span>}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed">
                    {post.content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                {/* Mobile Voting */}
                <div className="md:hidden pt-4 border-t border-border/40 flex items-center justify-between">
                    <VoteButtons
                        targetType="forum_post"
                        targetId={post.id}
                        initialUpvotes={post.upvotes}
                        initialDownvotes={post.downvotes}
                    />
                </div>
            </div>
        </div>
    );
}
