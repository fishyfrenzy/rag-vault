"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    subject: string;
    category: string;
    reference_image_url: string | null;
}

interface SuggestRelatedModalProps {
    vaultItemId: string;
    vaultItemSubject: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function SuggestRelatedModal({
    vaultItemId,
    vaultItemSubject,
    onClose,
    onSuccess,
}: SuggestRelatedModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<SearchResult | null>(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();

    const search = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setSearching(true);
        const { data } = await supabase
            .from("the_vault")
            .select("id, subject, category, reference_image_url")
            .ilike("subject", `%${searchQuery}%`)
            .neq("id", vaultItemId) // Exclude current item
            .limit(10);

        setResults((data as SearchResult[]) || []);
        setSearching(false);
    }, [vaultItemId]);

    useEffect(() => {
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    const handleSubmit = async () => {
        if (!selected || !user) return;

        setSubmitting(true);

        const { error } = await supabase.from("related_shirts").insert({
            shirt_a_id: vaultItemId,
            shirt_b_id: selected.id,
            proposed_by: user.id,
            reason: reason.trim() || null,
        });

        setSubmitting(false);

        if (!error) {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Suggest Related Shirt</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                    Find a shirt related to <strong>{vaultItemSubject}</strong>
                </p>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search vault..."
                        className="pl-9"
                    />
                    {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                </div>

                {/* Results */}
                {results.length > 0 && !selected && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelected(item)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:border-primary/50 transition-colors text-left"
                            >
                                <div className="w-12 h-12 rounded bg-secondary overflow-hidden flex-shrink-0">
                                    {item.reference_image_url ? (
                                        <img
                                            src={item.reference_image_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                            ?
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.subject}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected */}
                {selected && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="w-14 h-14 rounded bg-secondary overflow-hidden flex-shrink-0">
                                {selected.reference_image_url ? (
                                    <img
                                        src={selected.reference_image_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : null}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{selected.subject}</p>
                                <p className="text-sm text-muted-foreground">{selected.category}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelected(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why are these related? (optional)"
                        />

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Suggest
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {query.length > 0 && results.length === 0 && !searching && !selected && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No results found
                    </p>
                )}
            </div>
        </div>
    );
}
