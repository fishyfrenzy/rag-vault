"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Check, Loader2, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface IsoButtonProps {
    userId: string;
    vaultId: string;
    vaultSubject: string;
}

export function IsoButton({ userId, vaultId, vaultSubject }: IsoButtonProps) {
    const [isInIso, setIsInIso] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        const checkIso = async () => {
            const { data } = await supabase
                .from('user_iso_list')
                .select('id')
                .eq('user_id', userId)
                .eq('vault_id', vaultId)
                .single();

            setIsInIso(!!data);
            setLoading(false);
        };

        checkIso();
    }, [userId, vaultId]);

    const toggleIso = async () => {
        setToggling(true);

        if (isInIso) {
            await supabase
                .from('user_iso_list')
                .delete()
                .eq('user_id', userId)
                .eq('vault_id', vaultId);
            setIsInIso(false);
        } else {
            await supabase
                .from('user_iso_list')
                .insert({
                    user_id: userId,
                    vault_id: vaultId,
                    priority: 1,
                });
            setIsInIso(true);
        }

        setToggling(false);
    };

    if (loading) {
        return (
            <Button variant="outline" className="w-full h-11" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
            </Button>
        );
    }

    return (
        <Button
            variant={isInIso ? "default" : "outline"}
            className={cn(
                "w-full h-11 transition-all",
                isInIso && "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
            )}
            onClick={toggleIso}
            disabled={toggling}
        >
            {toggling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isInIso ? (
                <Check className="w-4 h-4 mr-2" />
            ) : (
                <Search className="w-4 h-4 mr-2" />
            )}
            {isInIso ? "In Your ISO List" : "Add to ISO List"}
        </Button>
    );
}

// ISO List management modal with vault search
interface IsoManageModalProps {
    userId: string;
    onClose: () => void;
}

interface IsoItem {
    id: string;
    priority: number;
    vault_id: string;
    sort_order: number;
    vault: { subject: string; category: string; reference_image_url?: string };
}

interface VaultSearchResult {
    id: string;
    subject: string;
    category: string;
    reference_image_url?: string;
}

export function IsoManageModal({ userId, onClose }: IsoManageModalProps) {
    const [items, setItems] = useState<IsoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchItems();
    }, [userId]);

    const fetchItems = async () => {
        const { data } = await supabase
            .from('user_iso_list')
            .select(`
                id, priority, vault_id,
                vault:the_vault(subject, category, reference_image_url)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (data) {
            const sortedItems = (data as unknown as IsoItem[]).map((item, index) => ({
                ...item,
                sort_order: index
            }));
            setItems(sortedItems);
        }
        setLoading(false);
    };

    // Debounced vault search
    const searchVault = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        const { data } = await supabase
            .from('the_vault')
            .select('id, subject, category, reference_image_url')
            .ilike('subject', `%${query}%`)
            .limit(10);

        if (data) {
            // Filter out items already in ISO list
            const existingIds = items.map(i => i.vault_id);
            setSearchResults(data.filter(v => !existingIds.includes(v.id)));
        }
        setSearching(false);
    }, [items]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) searchVault(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchVault]);

    const addToIso = async (vault: VaultSearchResult) => {
        const { data, error } = await supabase
            .from('user_iso_list')
            .insert({
                user_id: userId,
                vault_id: vault.id,
                priority: 1,
            })
            .select(`
                id, priority, vault_id,
                vault:the_vault(subject, category, reference_image_url)
            `)
            .single();

        if (error) {
            console.error('Error adding to ISO:', error);
            alert('Error adding item: ' + error.message);
            return;
        }

        if (data) {
            setItems(prev => [...prev, { ...data, sort_order: prev.length } as unknown as IsoItem]);
            setSearchResults(prev => prev.filter(v => v.id !== vault.id));
            setSearchQuery("");
            setShowSearch(false);
        }
    };

    const updatePriority = async (itemId: string, priority: number) => {
        await supabase
            .from('user_iso_list')
            .update({ priority })
            .eq('id', itemId);

        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, priority } : item
        ));
    };

    const removeItem = async (itemId: string) => {
        await supabase
            .from('user_iso_list')
            .delete()
            .eq('id', itemId);

        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    // Drag and drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, draggedItem);

        setItems(newItems);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        setDraggedIndex(null);
        // Note: sort_order column may not exist yet
        // Order is saved in-memory only until migration is applied
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-border/50 bg-secondary/20">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold">ISO List</h3>
                            <span className="text-sm text-muted-foreground">({items.length})</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSearch(true);
                            }}
                            onFocus={() => setShowSearch(true)}
                            placeholder="Search vault to add items..."
                            className="pl-9"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    {/* Search results dropdown */}
                    {showSearch && searchResults.length > 0 && (
                        <div className="mt-2 p-2 bg-background rounded-lg border border-border/50 max-h-48 overflow-y-auto">
                            {searchResults.map(vault => (
                                <button
                                    key={vault.id}
                                    onClick={() => addToIso(vault)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                        {vault.reference_image_url ? (
                                            <img src={vault.reference_image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">👕</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-sm">{vault.subject}</p>
                                        <p className="text-xs text-muted-foreground">{vault.category}</p>
                                    </div>
                                    <Plus className="w-4 h-4 text-primary" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12">
                            <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">No items in your ISO list</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                Search the vault above to add shirts
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground mb-2">Drag to reorder</p>
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all cursor-move",
                                        draggedIndex === index && "opacity-50 scale-95"
                                    )}
                                >
                                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                        {item.vault.reference_image_url ? (
                                            <img src={item.vault.reference_image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">👕</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{item.vault.subject}</p>
                                        <p className="text-xs text-muted-foreground">{item.vault.category}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => updatePriority(item.id, p)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                                                    item.priority === p
                                                        ? p === 3 ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                                            p === 2 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                                                "bg-secondary text-foreground border border-border"
                                                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                                )}
                                                title={p === 3 ? 'High' : p === 2 ? 'Medium' : 'Low'}
                                            >
                                                {p === 3 ? 'H' : p === 2 ? 'M' : 'L'}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-border/50 bg-secondary/10">
                    <Button className="w-full" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
}
