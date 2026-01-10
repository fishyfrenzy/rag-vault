"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    CheckCircle, ThumbsUp, ThumbsDown, Edit, PlusCircle,
    Tag, Image
} from "lucide-react";
import Link from "next/link";

interface ActivityItem {
    id: string;
    user_id: string;
    action_type: string;
    target_name: string | null;
    created_at: string;
    user: {
        display_name: string;
    } | null;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; verb: string; color: string }> = {
    create_entry: { icon: PlusCircle, verb: "added", color: "text-green-500" },
    verify: { icon: CheckCircle, verb: "verified", color: "text-blue-500" },
    upvote: { icon: ThumbsUp, verb: "upvoted", color: "text-green-500" },
    downvote: { icon: ThumbsDown, verb: "downvoted", color: "text-red-500" },
    edit_proposed: { icon: Edit, verb: "suggested edit on", color: "text-yellow-500" },
    list_for_sale: { icon: Tag, verb: "listed", color: "text-purple-500" },
    add_to_collection: { icon: PlusCircle, verb: "collected", color: "text-blue-500" },
    add_image: { icon: Image, verb: "added photo to", color: "text-cyan-500" },
};

function formatTimeAgo(dateString: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

interface ActivityTickerProps {
    variant?: "hero" | "header";
}

export function ActivityTicker({ variant = "header" }: ActivityTickerProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const fetchActivities = async () => {
            const { data } = await supabase
                .from("activity_feed")
                .select(`
          id, user_id, action_type, target_name, created_at,
          user:profiles(display_name)
        `)
                .order("created_at", { ascending: false })
                .limit(10);

            setActivities((data as unknown as ActivityItem[]) || []);
        };

        fetchActivities();

        // Real-time subscription for new activities
        const channel = supabase
            .channel("activity-ticker")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "activity_feed" },
                async (payload) => {
                    const { data } = await supabase
                        .from("activity_feed")
                        .select(`id, user_id, action_type, target_name, created_at, user:profiles(display_name)`)
                        .eq("id", payload.new.id)
                        .single();

                    if (data) {
                        setActivities((prev) => [data as unknown as ActivityItem, ...prev.slice(0, 9)]);
                        // Reset to show new activity
                        setCurrentIndex(0);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Cycle through activities every 5 seconds
    useEffect(() => {
        if (activities.length <= 1) return;

        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % activities.length);
                setIsAnimating(false);
            }, 300);
        }, 5000);

        return () => clearInterval(interval);
    }, [activities.length]);

    if (activities.length === 0) {
        return null;
    }

    const current = activities[currentIndex];
    const config = ACTION_CONFIG[current.action_type] || ACTION_CONFIG.create_entry;
    const Icon = config.icon;

    if (variant === "hero") {
        return (
            <Link href="/activity">
                <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/50 transition-opacity duration-300">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span>Live Activity</span>
                    </div>
                    <div
                        className={`flex items-center gap-3 transition-opacity duration-300 ${isAnimating ? "opacity-0" : "opacity-100"}`}
                    >
                        <div className={`p-2 rounded-lg bg-secondary ${config.color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {current.user?.display_name || "Someone"} {config.verb}{" "}
                                <span className="text-primary">{current.target_name || "an item"}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(current.created_at)}</p>
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    // Header variant - more compact, centered
    return (
        <Link href="/activity" className="block w-full">
            <div
                className={`flex items-center justify-center gap-2 transition-opacity duration-300 ${isAnimating ? "opacity-0" : "opacity-100"}`}
            >
                <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                <p className="text-xs truncate max-w-[150px]">
                    <span className="font-medium">{current.user?.display_name || "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{config.verb}</span>{" "}
                    <span className="font-medium">{current.target_name || "item"}</span>
                </p>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatTimeAgo(current.created_at)}
                </span>
            </div>
        </Link>
    );
}
