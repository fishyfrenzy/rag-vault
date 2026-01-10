"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface VaultItem {
    id: string;
    subject: string;
    category: string;
    year?: number;
    tag_brand?: string;
    reference_image_url?: string;
}

interface VaultSearchProps {
    onSelect: (item: VaultItem) => void;
    onCreateNew: (subject: string) => void;
}

export function VaultSearch({ onSelect, onCreateNew }: VaultSearchProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebounce(query, 500);
    const [results, setResults] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        async function searchVault() {
            if (!debouncedQuery) {
                setResults([]);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("the_vault")
                .select("*")
                .ilike("subject", `%${debouncedQuery}%`)
                .limit(5);

            if (error) {
                console.error(error);
            } else {
                setResults(data || []);
            }
            setLoading(false);
            setHasSearched(true);
        }

        searchVault();
    }, [debouncedQuery]);

    return (
        <div className="space-y-4 w-full">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for subject (e.g. Metallica, Harley)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 h-12 text-lg"
                />
            </div>

            <div className="space-y-2">
                {loading && <p className="text-sm text-muted-foreground text-center">Searching...</p>}

                {!loading && hasSearched && results.length === 0 && query && (
                    <div className="text-center p-4 border rounded-lg bg-secondary/50 space-y-2">
                        <p>No matches found in the Vault.</p>
                        <Button onClick={() => onCreateNew(query)} variant="secondary" className="w-full">
                            Create new entry for &quot;{query}&quot;
                        </Button>
                    </div>
                )}

                {!loading && results.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                    >
                        <div className="w-12 h-12 bg-muted rounded-md shrink-0 overflow-hidden">
                            {item.reference_image_url && <img src={item.reference_image_url} alt={item.subject} className="w-full h-full object-cover" />}
                        </div>
                        <div className="text-left">
                            <p className="font-medium">{item.subject}</p>
                            <p className="text-xs text-muted-foreground">
                                {item.category} • {item.year || '?'} • {item.tag_brand || 'Unknown Tag'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
