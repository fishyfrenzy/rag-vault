"use client";

import React, { useEffect, useState } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle, ThumbsUp, ThumbsDown, Edit, PlusCircle,
    Tag, Image, RefreshCw
} from "lucide-react";
import Link from "next/link";

interface Activity {
    id: string;
    user_id: string;
    action_type: string;
    target_type: string;
    target_id: string;
    target_name: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    user: {
        display_name: string;
    } | null;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    create_entry: { icon: PlusCircle, label: "created", color: "text-green-500" },
    verify: { icon: CheckCircle, label: "verified", color: "text-blue-500" },
    upvote: { icon: ThumbsUp, label: "upvoted", color: "text-green-500" },
    downvote: { icon: ThumbsDown, label: "downvoted", color: "text-red-500" },
    edit_proposed: { icon: Edit, label: "suggested edit on", color: "text-yellow-500" },
    edit_approved: { icon: CheckCircle, label: "approved edit on", color: "text-green-500" },
    edit_rejected: { icon: Edit, label: "rejected edit on", color: "text-red-500" },
    list_for_sale: { icon: Tag, label: "listed for sale", color: "text-purple-500" },
    add_to_collection: { icon: PlusCircle, label: "added to collection", color: "text-blue-500" },
    add_image: { icon: Image, label: "added image to", color: "text-cyan-500" },
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

export default function ActivityPage() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(true);

    const fetchActivitiesRef = React.useRef<() => Promise<void>>(undefined);

    useEffect(() => {
        const fetchActivities = async () => {
            const { data, error } = await supabase
                .from("activity_feed")
                .select(`
            id, user_id, action_type, target_type, target_id, target_name, metadata, created_at,
            user:profiles(display_name)
          `)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching activity:", error);
            } else {
                setActivities((data as unknown as Activity[]) || []);
            }
            setLoading(false);
        };

        // Store in ref for external access
        fetchActivitiesRef.current = fetchActivities;

        fetchActivities();

        // Real-time subscription
        const channel = supabase
            .channel("activity-feed")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "activity_feed" },
                async (payload) => {
                    // Fetch the full activity with user info
                    const { data } = await supabase
                        .from("activity_feed")
                        .select(`
              id, user_id, action_type, target_type, target_id, target_name, metadata, created_at,
              user:profiles(display_name)
            `)
                        .eq("id", payload.new.id)
                        .single();

                    if (data) {
                        setActivities((prev) => [data as unknown as Activity, ...prev.slice(0, 49)]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRefresh = () => {
        fetchActivitiesRef.current?.();
    };

    return (
        <MobileContainer className="pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Activity</h1>
                        <p className="text-sm text-muted-foreground">Recent community actions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLive && (
                            <Badge variant="outline" className="gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Live
                            </Badge>
                        )}
                        <button
                            onClick={handleRefresh}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-border">
                {loading && (
                    <div className="p-6 text-center text-muted-foreground">
                        Loading activity...
                    </div>
                )}

                {!loading && activities.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        <p>No activity yet.</p>
                        <p className="text-sm">Be the first to contribute!</p>
                    </div>
                )}

                {activities.map((activity) => {
                    const config = ACTION_CONFIG[activity.action_type] || ACTION_CONFIG.create_entry;
                    const Icon = config.icon;
                    const targetLink = activity.target_type === "vault_item"
                        ? `/vault/${activity.target_id}`
                        : activity.target_type === "edit_proposal"
                            ? "/review"
                            : null;

                    return (
                        <div key={activity.id} className="px-6 py-4 flex items-start gap-4">
                            <div className={`mt-1 ${config.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                    <span className="font-medium">
                                        {activity.user?.display_name || "Someone"}
                                    </span>{" "}
                                    <span className="text-muted-foreground">{config.label}</span>{" "}
                                    {targetLink ? (
                                        <Link href={targetLink} className="font-medium hover:underline">
                                            {activity.target_name || "an item"}
                                        </Link>
                                    ) : (
                                        <span className="font-medium">{activity.target_name || "an item"}</span>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatTimeAgo(activity.created_at)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </MobileContainer>
    );
}
