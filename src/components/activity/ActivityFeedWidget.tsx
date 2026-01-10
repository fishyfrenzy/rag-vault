"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    CheckCircle, ThumbsUp, ThumbsDown, Edit, PlusCircle,
    Tag, Image, Activity
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

const ACTION_ICONS: Record<string, React.ElementType> = {
    create_entry: PlusCircle,
    verify: CheckCircle,
    upvote: ThumbsUp,
    downvote: ThumbsDown,
    edit_proposed: Edit,
    list_for_sale: Tag,
    add_to_collection: PlusCircle,
    add_image: Image,
};

const ACTION_COLORS: Record<string, string> = {
    create_entry: "text-green-500",
    verify: "text-blue-500",
    upvote: "text-green-500",
    downvote: "text-red-500",
    edit_proposed: "text-yellow-500",
    list_for_sale: "text-purple-500",
    add_to_collection: "text-blue-500",
    add_image: "text-cyan-500",
};

function formatTimeAgo(dateString: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

interface ActivityFeedWidgetProps {
    maxItems?: number;
    compact?: boolean;
}

export function ActivityFeedWidget({ maxItems = 8, compact = false }: ActivityFeedWidgetProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            const { data } = await supabase
                .from("activity_feed")
                .select(`
          id, user_id, action_type, target_name, created_at,
          user:profiles(display_name)
        `)
                .order("created_at", { ascending: false })
                .limit(maxItems);

            setActivities((data as unknown as ActivityItem[]) || []);
            setLoading(false);
        };

        fetchActivities();

        // Real-time subscription
        const channel = supabase
            .channel("activity-widget")
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
                        setActivities((prev) => [data as unknown as ActivityItem, ...prev.slice(0, maxItems - 1)]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [maxItems]);

    if (loading) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Loading...
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                No activity yet
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Live Activity</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <Link href="/activity" className="text-xs text-primary hover:underline">
                    View all
                </Link>
            </div>

            {/* Items */}
            <div className={compact ? "flex gap-2 overflow-x-auto pb-2 no-scrollbar" : "space-y-1"}>
                {activities.map((item) => {
                    const Icon = ACTION_ICONS[item.action_type] || PlusCircle;
                    const color = ACTION_COLORS[item.action_type] || "text-muted-foreground";

                    if (compact) {
                        // Horizontal scrolling cards for mobile
                        return (
                            <div
                                key={item.id}
                                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-xs"
                            >
                                <Icon className={`w-3.5 h-3.5 ${color}`} />
                                <Link href={`/u/${item.user_id}`} className="font-medium truncate max-w-[80px] hover:underline">
                                    {item.user?.display_name || "User"}
                                </Link>
                                <span className="text-muted-foreground">
                                    {formatTimeAgo(item.created_at)}
                                </span>
                            </div>
                        );
                    }

                    // Vertical list for desktop sidebar
                    return (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                            <div className="flex-1 min-w-0 text-xs">
                                <Link href={`/u/${item.user_id}`} className="font-medium hover:underline">
                                    {item.user?.display_name || "User"}
                                </Link>{" "}
                                <span className="text-muted-foreground truncate">
                                    → {item.target_name || "item"}
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {formatTimeAgo(item.created_at)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
