"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";

interface VaultItem {
    id: string;
    subject: string;
    category: string;
    slug: string | null;
    reference_image_url: string | null;
}

interface VaultEmbedPickerProps {
    onSelect: (item: VaultItem) => void;
    onClose: () => void;
}

export function VaultEmbedPicker({ onSelect, onClose }: VaultEmbedPickerProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const search = async () => {
            if (!debouncedQuery) {
                setResults([]);
                return;
            }

            setLoading(true);
            const { data } = await supabase
                .from("the_vault")
                .select("id, subject, category, slug, reference_image_url")
                .ilike("subject", `%${debouncedQuery}%`)
                .order("verification_count", { ascending: false })
                .limit(10);

            setResults((data as VaultItem[]) || []);
            setLoading(false);
        };

        search();
    }, [debouncedQuery]);

    // Load recent items on mount
    useEffect(() => {
        const loadRecent = async () => {
            setLoading(true);
            const { data } = await supabase
                .from("the_vault")
                .select("id, subject, category, slug, reference_image_url")
                .order("created_at", { ascending: false })
                .limit(6);

            setResults((data as VaultItem[]) || []);
            setLoading(false);
        };

        loadRecent();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Select Vault Item</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search vault items..."
                            className="pl-9"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {query ? "No items found" : "Start typing to search"}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {!query && (
                                <p className="text-xs text-muted-foreground px-3 py-2">Recent items</p>
                            )}
                            {results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                                        {item.reference_image_url ? (
                                            <img
                                                src={item.reference_image_url}
                                                alt={item.subject}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground/30">
                                                {item.subject.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{item.subject}</p>
                                        <p className="text-sm text-muted-foreground">{item.category}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
