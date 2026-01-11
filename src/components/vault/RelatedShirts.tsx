"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RelatedShirt {
    id: string;
    related_shirt_id: string;
    subject: string;
    category: string;
    reference_image_url: string | null;
    score: number;
    reason: string | null;
}

interface RelatedShirtsProps {
    vaultItemId: string;
    onSuggestClick?: () => void;
}

export function RelatedShirts({ vaultItemId, onSuggestClick }: RelatedShirtsProps) {
    const [related, setRelated] = useState<RelatedShirt[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchRelated = async () => {
        const { data } = await supabase.rpc("get_related_shirts", {
            p_vault_item_id: vaultItemId,
        });
        setRelated((data as RelatedShirt[]) || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchRelated();
    }, [vaultItemId]);

    const handleVote = async (relatedId: string, voteType: "up" | "down") => {
        if (!user) return;
        setVoting(relatedId);

        await supabase.rpc("vote_related_shirt", {
            p_related_id: relatedId,
            p_vote_type: voteType,
        });

        await fetchRelated();
        setVoting(null);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {related.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                    {related.map((item) => (
                        <div key={item.id} className="space-y-2">
                            <Link
                                href={`/vault/${item.related_shirt_id}`}
                                className="block aspect-square rounded-lg overflow-hidden bg-secondary group"
                            >
                                {item.reference_image_url ? (
                                    <img
                                        src={item.reference_image_url}
                                        alt={item.subject}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                        No Image
                                    </div>
                                )}
                            </Link>

                            <p className="text-xs font-medium truncate">{item.subject}</p>

                            {/* Vote buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleVote(item.id, "up")}
                                    disabled={!user || voting === item.id}
                                    className={cn(
                                        "p-1 rounded hover:bg-green-500/10 transition-colors disabled:opacity-50",
                                        "text-muted-foreground hover:text-green-500"
                                    )}
                                >
                                    {voting === item.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <ThumbsUp className="w-3 h-3" />
                                    )}
                                </button>
                                <span className="text-xs text-muted-foreground min-w-[20px] text-center">
                                    {item.score}
                                </span>
                                <button
                                    onClick={() => handleVote(item.id, "down")}
                                    disabled={!user || voting === item.id}
                                    className={cn(
                                        "p-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-50",
                                        "text-muted-foreground hover:text-red-500"
                                    )}
                                >
                                    <ThumbsDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No related shirts yet
                </p>
            )}

            {user && onSuggestClick && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onSuggestClick}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Suggest Related Shirt
                </Button>
            )}
        </div>
    );
}
