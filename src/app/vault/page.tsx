"use client";

import { useEffect, useState } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { VaultItemCard } from "@/components/vault/VaultItemCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, CheckCircle, Plus } from "lucide-react";
import Link from "next/link";
import { SkeletonCardGrid } from "@/components/ui/skeleton";

interface VaultItem {
    id: string;
    subject: string;
    category: string;
    year: number | null;
    tag_brand: string | null;
    reference_image_url: string | null;
    verification_count: number;
    created_at: string;
}

const CATEGORIES = ["All", "Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"];

export default function VaultPage() {
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);

            let query = supabase
                .from("the_vault")
                .select("*")
                .order("verification_count", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(50);

            if (search) {
                query = query.ilike("subject", `%${search}%`);
            }

            if (category !== "All") {
                query = query.eq("category", category);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching vault:", error);
            } else {
                setItems(data || []);
            }
            setLoading(false);
        };

        fetchItems();
    }, [search, category]);

    return (
        <MobileContainer className="pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">The Vault</h1>
                    <Link href="/vault/new">
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Item
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search shirts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <Button
                            key={cat}
                            variant={category === cat ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setCategory(cat)}
                            className="shrink-0"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => (
                    <Link href={`/vault/${item.id}`} key={item.id}>
                        <div className="relative">
                            <VaultItemCard
                                subject={item.subject}
                                category={item.category}
                                imageUrl={item.reference_image_url}
                            />
                            {item.verification_count >= 3 && (
                                <div className="absolute top-2 right-2 bg-green-500/90 text-white rounded-full p-1">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {loading && (
                <div className="px-6 py-4">
                    <SkeletonCardGrid count={8} />
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="py-12 text-center text-muted-foreground space-y-4">
                    <p>No items found.</p>
                    <Button variant="outline" asChild>
                        <Link href="/vault/new">Add the first entry</Link>
                    </Button>
                </div>
            )}
        </MobileContainer>
    );
}
