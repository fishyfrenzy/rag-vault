"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { ThumbsUp, ThumbsDown, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";

interface VaultTag {
    id: string;
    tag_name: string;
    tag_slug: string;
    upvotes: number;
    downvotes: number;
    score: number;
    user_vote: string | null;
}

interface TagPoolItem {
    id: string;
    name: string;
    slug: string;
    usage_count: number;
}

interface VaultTagsProps {
    vaultItemId: string;
    className?: string;
}

export function VaultTags({ vaultItemId, className }: VaultTagsProps) {
    const { user } = useAuth();
    const [tags, setTags] = useState<VaultTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTag, setShowAddTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState("");
    const [suggestions, setSuggestions] = useState<TagPoolItem[]>([]);
    const [addingTag, setAddingTag] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);

    // Fetch tags for this item
    const fetchTags = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc("get_vault_tags", {
                p_vault_item_id: vaultItemId
            });

            if (error) {
                console.error("Error fetching tags:", error);
                return;
            }

            setTags(data || []);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, [vaultItemId]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    // Search for tag suggestions
    const searchTags = async (query: string) => {
        if (query.length < 1) {
            setSuggestions([]);
            return;
        }

        const { data } = await supabase.rpc("search_tags", {
            query,
            result_limit: 5
        });

        setSuggestions(data || []);
    };

    // Handle vote
    const handleVote = async (tagId: string, voteType: "up" | "down") => {
        if (!user) return;

        setVotingId(tagId);
        try {
            const { data, error } = await supabase.rpc("vote_vault_tag", {
                p_vault_tag_id: tagId,
                p_vote: voteType
            });

            if (error) throw error;

            // Update local state
            setTags(prev => prev.map(tag =>
                tag.id === tagId
                    ? { ...tag, ...data }
                    : tag
            ));
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVotingId(null);
        }
    };

    // Add new tag
    const handleAddTag = async (tagName: string) => {
        if (!user || !tagName.trim()) return;

        setAddingTag(true);
        try {
            const { data, error } = await supabase.rpc("add_vault_tag", {
                p_vault_item_id: vaultItemId,
                p_tag_name: tagName.trim()
            });

            if (error) throw error;

            if (data.error) {
                console.error(data.error);
                return;
            }

            // Refresh tags
            await fetchTags();
            setNewTagInput("");
            setShowAddTag(false);
            setSuggestions([]);
        } catch (err) {
            console.error("Add tag error:", err);
        } finally {
            setAddingTag(false);
        }
    };

    if (loading) {
        return (
            <div className={cn("space-y-2", className)}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Community Tags
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading tags...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Community Tags
                </h3>
                {user && !showAddTag && (
                    <button
                        onClick={() => setShowAddTag(true)}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add Tag
                    </button>
                )}
            </div>

            {/* Add Tag Input */}
            {showAddTag && (
                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => {
                                setNewTagInput(e.target.value);
                                searchTags(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newTagInput.trim()) {
                                    handleAddTag(newTagInput);
                                } else if (e.key === "Escape") {
                                    setShowAddTag(false);
                                    setNewTagInput("");
                                    setSuggestions([]);
                                }
                            }}
                            placeholder="Type a tag (e.g., Grail, Bootleg, 90s)"
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none"
                            autoFocus
                            disabled={addingTag}
                        />
                        <button
                            onClick={() => {
                                setShowAddTag(false);
                                setNewTagInput("");
                                setSuggestions([]);
                            }}
                            className="p-2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Suggestions dropdown */}
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-12 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.id}
                                    onClick={() => handleAddTag(suggestion.name)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center justify-between"
                                >
                                    <span>{suggestion.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {suggestion.usage_count} uses
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tags List */}
            {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No tags yet. {user ? "Be the first to add one!" : "Sign in to add tags."}
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <div
                            key={tag.id}
                            className="group flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 hover:border-primary/30 transition-colors"
                        >
                            {/* Tag Link */}
                            <a
                                href={`/vault?search=${encodeURIComponent(tag.tag_name)}`}
                                className="text-sm font-medium hover:text-primary transition-colors"
                            >
                                {tag.tag_name}
                            </a>

                            {/* Vote Buttons */}
                            {user && (
                                <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleVote(tag.id, "up")}
                                        disabled={votingId === tag.id}
                                        className={cn(
                                            "p-1 rounded hover:bg-green-500/20 transition-colors",
                                            tag.user_vote === "up" && "text-green-500"
                                        )}
                                    >
                                        <ThumbsUp className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleVote(tag.id, "down")}
                                        disabled={votingId === tag.id}
                                        className={cn(
                                            "p-1 rounded hover:bg-red-500/20 transition-colors",
                                            tag.user_vote === "down" && "text-red-500"
                                        )}
                                    >
                                        <ThumbsDown className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Score */}
                            <span className={cn(
                                "text-xs ml-1",
                                tag.score > 0 ? "text-green-500" :
                                    tag.score < 0 ? "text-red-500" : "text-muted-foreground"
                            )}>
                                {tag.score > 0 ? `+${tag.score}` : tag.score}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
