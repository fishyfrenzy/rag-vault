"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Clock, User, Edit, CheckCircle, ImagePlus, GitBranch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryEntry {
    id: string;
    action: string;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    user: { display_name: string } | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    created: <CheckCircle className="w-4 h-4 text-green-500" />,
    edited: <Edit className="w-4 h-4 text-blue-500" />,
    verified: <CheckCircle className="w-4 h-4 text-purple-500" />,
    image_added: <ImagePlus className="w-4 h-4 text-orange-500" />,
    variant_added: <GitBranch className="w-4 h-4 text-cyan-500" />,
};

const ACTION_LABELS: Record<string, string> = {
    created: "Created this entry",
    edited: "Edited",
    verified: "Verified this entry",
    image_added: "Added image",
    variant_added: "Added variant",
};

interface ItemHistoryProps {
    vaultItemId: string;
}

export function ItemHistory({ vaultItemId }: ItemHistoryProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            const { data } = await supabase
                .from("vault_history")
                .select(`
                    id, action, field_name, old_value, new_value, created_at,
                    user:profiles!user_id(display_name)
                `)
                .eq("vault_item_id", vaultItemId)
                .order("created_at", { ascending: false })
                .limit(20);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedData = (data || []).map((entry: any) => ({
                ...entry,
                user: Array.isArray(entry.user) ? entry.user[0] : entry.user,
            }));
            setHistory(formattedData as HistoryEntry[]);
            setLoading(false);
        }

        fetchHistory();
    }, [vaultItemId]);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                No history yet
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {history.map((entry, index) => (
                <div key={entry.id} className="flex gap-3">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            {ACTION_ICONS[entry.action] || <Clock className="w-4 h-4" />}
                        </div>
                        {index < history.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-2" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                                {entry.user?.display_name || "Unknown"}
                            </span>
                            <span className="text-muted-foreground">
                                {ACTION_LABELS[entry.action] || entry.action}
                                {entry.field_name && ` ${entry.field_name}`}
                            </span>
                        </div>

                        {entry.old_value && entry.new_value && (
                            <div className="mt-1 text-xs space-y-1">
                                <div className="text-red-400 line-through truncate">
                                    {entry.old_value}
                                </div>
                                <div className="text-green-400 truncate">
                                    {entry.new_value}
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-1">
                            {new Date(entry.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
