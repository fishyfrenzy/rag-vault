"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { ShirtCard } from "@/components/inventory/ShirtCard";
import { CollectionCard } from "@/components/inventory/CollectionCard";
import { CreateCollectionModal } from "@/components/inventory/CreateCollectionModal";
import { Button } from "@/components/ui/button";
import { FolderHeart, Plus, Grid3X3, FolderOpen } from "lucide-react";
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
    collection_id: string | null;
    vault: {
        id: string;
        subject: string;
        category: string;
        year: number | null;
        reference_image_url: string | null;
    };
}

interface Collection {
    id: string;
    name: string;
    color: string;
    is_private: boolean;
    item_count: number;
}

type ViewMode = "all" | "collections";

export default function MyCollectionPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [showCreateCollection, setShowCreateCollection] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            setLoadingData(true);

            // Fetch inventory items
            const { data: inventoryData, error: inventoryError } = await supabase
                .from("user_inventory")
                .select(`
                    id, size, condition, price, for_sale, images, body_type, tag, collection_id,
                    vault:the_vault(id, subject, category, year, reference_image_url)
                `)
                .eq("user_id", user.id)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (inventoryError) {
                console.error("Error fetching inventory:", inventoryError);
            } else {
                setItems(inventoryData as unknown as InventoryItem[]);
            }

            // Fetch collections with item counts
            const { data: collectionsData, error: collectionsError } = await supabase
                .from("user_collections")
                .select("id, name, color, is_private")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (collectionsError) {
                console.error("Error fetching collections:", collectionsError);
            } else {
                // Calculate item counts for each collection
                const collectionsWithCounts = (collectionsData || []).map(col => ({
                    ...col,
                    item_count: (inventoryData || []).filter(item => item.collection_id === col.id).length
                }));
                setCollections(collectionsWithCounts as Collection[]);
            }

            setLoadingData(false);
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    if (loading) {
        return (
            <MobileContainer className="flex items-center justify-center h-screen">
                <p>Loading...</p>
            </MobileContainer>
        );
    }

    if (!user) return null;

    const uncategorizedItems = items.filter(item => !item.collection_id);

    return (
        <MobileContainer className="p-6 pb-24">
            {/* Header */}
            <div className="space-y-6 mb-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FolderHeart className="w-6 h-6 text-primary" />
                            <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
                        </div>
                        <p className="text-muted-foreground">
                            {items.length} {items.length === 1 ? "piece" : "pieces"} in your vault
                        </p>
                    </div>

                    <Button onClick={() => router.push("/sell")} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Shirt
                    </Button>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl w-fit">
                    <button
                        onClick={() => setViewMode("all")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            viewMode === "all"
                                ? "bg-background text-foreground shadow"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Grid3X3 className="w-4 h-4" />
                        All Items
                    </button>
                    <button
                        onClick={() => setViewMode("collections")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            viewMode === "collections"
                                ? "bg-background text-foreground shadow"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Collections
                    </button>
                </div>
            </div>

            {/* Content */}
            {loadingData ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] rounded-2xl bg-secondary/50 animate-pulse" />
                    ))}
                </div>
            ) : viewMode === "all" ? (
                // All Items View
                items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-6xl mb-4">👕</div>
                        <p className="text-lg font-semibold">No shirts yet</p>
                        <p className="text-muted-foreground mb-6">Start building your collection</p>
                        <Button onClick={() => router.push("/sell")}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Shirt
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.map(item => (
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
                )
            ) : (
                // Collections View
                <div className="space-y-8">
                    {/* Collections Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <CollectionCard
                            name="New Collection"
                            itemCount={0}
                            isEmpty
                            onClick={() => setShowCreateCollection(true)}
                        />
                        {collections.map(col => (
                            <CollectionCard
                                key={col.id}
                                name={col.name}
                                itemCount={col.item_count}
                                color={col.color}
                                isPrivate={col.is_private}
                            />
                        ))}
                    </div>

                    {/* Uncategorized Items */}
                    {uncategorizedItems.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-muted-foreground">
                                Uncategorized ({uncategorizedItems.length})
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {uncategorizedItems.map(item => (
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
                        </div>
                    )}
                </div>
            )}

            {/* Create Collection Modal */}
            {showCreateCollection && (
                <CreateCollectionModal
                    userId={user.id}
                    onClose={() => setShowCreateCollection(false)}
                    onCreated={(newCollection) => {
                        setCollections(prev => [{ ...newCollection, item_count: 0 }, ...prev]);
                        setShowCreateCollection(false);
                    }}
                />
            )}
        </MobileContainer>
    );
}
