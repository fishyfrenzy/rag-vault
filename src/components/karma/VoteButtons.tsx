"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
    targetType: "vault_item" | "edit_proposal";
    targetId: string;
    initialUpvotes?: number;
    initialDownvotes?: number;
    initialUserVote?: "up" | "down" | null;
    onVoteChange?: (upvotes: number, downvotes: number) => void;
}

export function VoteButtons({
    targetType,
    targetId,
    initialUpvotes = 0,
    initialDownvotes = 0,
    initialUserVote = null,
    onVoteChange,
}: VoteButtonsProps) {
    const { user } = useAuth();
    const [upvotes, setUpvotes] = useState(initialUpvotes);
    const [downvotes, setDownvotes] = useState(initialDownvotes);
    const [userVote, setUserVote] = useState<"up" | "down" | null>(initialUserVote);
    const [loading, setLoading] = useState(false);

    const handleVote = async (voteType: "up" | "down") => {
        if (!user || loading) return;

        setLoading(true);

        try {
            if (userVote === voteType) {
                // Remove vote
                await supabase
                    .from("votes")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("target_type", targetType)
                    .eq("target_id", targetId);

                if (voteType === "up") {
                    setUpvotes((v) => v - 1);
                } else {
                    setDownvotes((v) => v - 1);
                }
                setUserVote(null);
            } else {
                // Remove existing vote if any
                if (userVote) {
                    await supabase
                        .from("votes")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("target_type", targetType)
                        .eq("target_id", targetId);

                    if (userVote === "up") {
                        setUpvotes((v) => v - 1);
                    } else {
                        setDownvotes((v) => v - 1);
                    }
                }

                // Add new vote
                await supabase.from("votes").insert({
                    user_id: user.id,
                    target_type: targetType,
                    target_id: targetId,
                    vote_type: voteType,
                });

                if (voteType === "up") {
                    setUpvotes((v) => v + 1);
                } else {
                    setDownvotes((v) => v + 1);
                }
                setUserVote(voteType);
            }

            onVoteChange?.(upvotes, downvotes);
        } catch (error) {
            console.error("Vote error:", error);
        }

        setLoading(false);
    };

    const score = upvotes - downvotes;

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={() => handleVote("up")}
                disabled={!user || loading}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    userVote === "up"
                        ? "bg-green-500/20 text-green-500"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground",
                    (!user || loading) && "opacity-50 cursor-not-allowed"
                )}
                title={user ? "Upvote" : "Log in to vote"}
            >
                <ThumbsUp className="w-5 h-5" />
            </button>

            <span
                className={cn(
                    "min-w-[2rem] text-center font-bold",
                    score > 0 && "text-green-500",
                    score < 0 && "text-red-500",
                    score === 0 && "text-muted-foreground"
                )}
            >
                {score}
            </span>

            <button
                onClick={() => handleVote("down")}
                disabled={!user || loading}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    userVote === "down"
                        ? "bg-red-500/20 text-red-500"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground",
                    (!user || loading) && "opacity-50 cursor-not-allowed"
                )}
                title={user ? "Downvote" : "Log in to vote"}
            >
                <ThumbsDown className="w-5 h-5" />
            </button>
        </div>
    );
}
