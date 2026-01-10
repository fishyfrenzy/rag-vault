"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { ShirtCard } from "@/components/inventory/ShirtCard";
import { Badge } from "@/components/ui/badge";
import { Store, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryItem {
    id: string;
    size: string | null;
    condition: number | null;
    price: number | null;
    for_sale: boolean;
    images: { view: string; url: string }[] | null;
    body_type: string | null;
    tag: string | null;
    material: string | null;
    vault: {
        id: string;
        subject: string;
        category: string;
        year: number | null;
        reference_image_url: string | null;
    };
    collection: {
        is_private: boolean;
    } | null;
}

const categories = ["All", "Music", "Motorcycle", "Movie", "Art", "Sport", "Other"];
const bodyTypes = ["All", "t-shirt", "long-sleeve", "cutoff", "jacket", "hoodie", "sweater", "raglan", "other"];

export default function MarketplacePage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedBodyType, setSelectedBodyType] = useState("All");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);

            let query = supabase
                .from("user_inventory")
                .select(`
                    id, size, condition, price, for_sale, images, body_type, tag, material,
                    vault:the_vault(id, subject, category, year, reference_image_url),
                    collection:user_collections(is_private)
                `)
                .eq("is_active", true)
                .eq("for_sale", true)  // Only show items for sale
                .order("created_at", { ascending: false });

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching marketplace items:", error);
            } else {
                // Filter out private collections client-side (collection can be null which means public)
                const publicItems = (data as unknown as InventoryItem[]).filter(
                    item => !item.collection?.is_private
                );
                setItems(publicItems);
            }
            setLoading(false);
        };

        fetchItems();
    }, []);

    // Apply filters
    const filteredItems = items.filter(item => {
        if (selectedCategory !== "All" && item.vault?.category !== selectedCategory) return false;
        if (selectedBodyType !== "All" && item.body_type !== selectedBodyType) return false;
        return true;
    });

    const activeFilterCount = [
        selectedCategory !== "All",
        selectedBodyType !== "All",
    ].filter(Boolean).length;

    return (
        <MobileContainer className="p-6 pb-24">
            {/* Header */}
            <div className="space-y-6 mb-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Store className="w-6 h-6 text-primary" />
                            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
                        </div>
                        <p className="text-muted-foreground">
                            {items.length} items for sale
                        </p>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "relative p-3 rounded-xl border transition-colors",
                            showFilters || activeFilterCount > 0
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Filter className="w-5 h-5" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50 animate-in slide-in-from-top-2">
                        {/* Category Filter */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</p>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                            selectedCategory === cat
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary hover:bg-secondary/80"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Body Type Filter */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body Type</p>
                            <div className="flex flex-wrap gap-2">
                                {bodyTypes.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedBodyType(type)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                                            selectedBodyType === type
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary hover:bg-secondary/80"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedCategory("All");
                                    setSelectedBodyType("All");
                                }}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] rounded-2xl bg-secondary/50 animate-pulse" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-lg font-semibold">No items found</p>
                    <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                        <ShirtCard
                            key={item.id}
                            id={item.id}
                            subject={item.vault?.subject || "Unknown"}
                            category={item.vault?.category}
                            year={item.vault?.year}
                            size={item.size}
                            condition={item.condition}
                            price={item.price}
                            forSale={item.for_sale}
                            imageUrl={item.images?.[0]?.url || item.vault?.reference_image_url}
                            bodyType={item.body_type}
                            tag={item.tag}
                        />
                    ))}
                </div>
            )}
        </MobileContainer>
    );
}
