"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Folder, Check, Loader2, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

// Collection Selector for profile slots
interface CollectionSelectorProps {
    userId: string;
    onSelect: (collectionId: string, collectionName: string) => void;
    onClose: () => void;
}

interface Collection {
    id: string;
    name: string;
    color: string;
    is_private: boolean;
}

export function CollectionSelector({ userId, onSelect, onClose }: CollectionSelectorProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            const { data } = await supabase
                .from('user_collections')
                .select('id, name, color, is_private')
                .eq('user_id', userId);

            if (data) setCollections(data);
            setLoading(false);
        };

        fetchCollections();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/20">
                    <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-bold">Choose Collection</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="text-center py-12">
                            <Folder className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">No collections found</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                Create a collection first
                            </p>
                        </div>
                    ) : (
                        collections.map(col => (
                            <button
                                key={col.id}
                                onClick={() => onSelect(col.id, col.name)}
                                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: col.color + '30' }}
                                >
                                    <Folder className="w-5 h-5" style={{ color: col.color }} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{col.name}</p>
                                    {col.is_private && (
                                        <span className="text-xs text-muted-foreground">Private</span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Shirt multi-selector for featured shirts slot
interface ShirtSelectorProps {
    userId: string;
    onSelect: (shirtIds: string[], title: string) => void;
    onClose: () => void;
    maxSelection?: number;
}

interface InventoryItem {
    id: string;
    vault: { subject: string; category: string; reference_image_url?: string };
    images: { url: string }[] | null;
}

export function ShirtSelector({ userId, onSelect, onClose, maxSelection = 6 }: ShirtSelectorProps) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [title, setTitle] = useState("Featured");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            const { data } = await supabase
                .from('user_inventory')
                .select(`
                    id, images,
                    vault:the_vault(subject, category, reference_image_url)
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data) setItems(data as unknown as InventoryItem[]);
            setLoading(false);
        };

        fetchItems();
    }, [userId]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            }
            if (prev.length >= maxSelection) {
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleConfirm = () => {
        if (selected.length > 0) {
            onSelect(selected, title);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-border/50 bg-secondary/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shirt className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold">Featured Shirts</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Section title"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        Select up to {maxSelection} shirts ({selected.length}/{maxSelection})
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12">
                            <Shirt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">No shirts in your collection</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {items.map(item => {
                                const isSelected = selected.includes(item.id);
                                const imageUrl = item.images?.[0]?.url || item.vault?.reference_image_url;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleSelect(item.id)}
                                        className={cn(
                                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                                            isSelected
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-border"
                                        )}
                                    >
                                        {imageUrl ? (
                                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                                                <span className="text-2xl">👕</span>
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-primary-foreground" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                            <p className="text-xs text-white truncate">{item.vault?.subject}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border/50 bg-secondary/10 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleConfirm}
                        disabled={selected.length === 0}
                    >
                        Add {selected.length} Shirt{selected.length !== 1 ? 's' : ''}
                    </Button>
                </div>
            </div>
        </div>
    );
}
