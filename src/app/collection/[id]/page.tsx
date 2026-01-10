"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Calendar,
    Tag,
    Ruler,
    DollarSign,
    Edit,
    ExternalLink,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Link from "next/link";

interface InventoryItem {
    id: string;
    vault_id: string;
    user_id: string;
    size: string | null;
    condition: number | null;
    price: number | null;
    for_sale: boolean;
    images: { view: string; url: string }[] | null;
    measurements: { length?: number; pit_to_pit?: number } | null;
    tag: string | null;
    material: string | null;
    body_type: string | null;
    flaws: string | null;
    description: string | null;
    created_at: string;
    // Joined vault data
    vault: {
        id: string;
        subject: string;
        category: string;
        year: number | null;
        tag_brand: string[] | null;
        stitch_type: string | null;
        reference_image_url: string | null;
        body_type: string | null;
    };
}

const conditionLabels: Record<number, string> = {
    10: "Deadstock",
    9: "Mint",
    8: "Excellent",
    7: "Good",
    6: "Fair",
    5: "Average",
    4: "Below Average",
    3: "Poor",
    2: "Bad",
    1: "Thrashed"
};

export default function CollectionItemPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchItem = async () => {
            const { data, error } = await supabase
                .from("user_inventory")
                .select(`
                    *,
                    vault:the_vault(id, subject, category, year, tag_brand, stitch_type, reference_image_url, body_type)
                `)
                .eq("id", params.id)
                .single();

            if (error) {
                console.error("Error fetching item:", error);
            } else {
                setItem(data as InventoryItem);
            }
            setLoading(false);
        };

        if (params.id) {
            fetchItem();
        }
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Item not found</p>
            </div>
        );
    }

    const images = item.images || [];
    const hasMultipleImages = images.length > 1;
    const currentImage = images[currentImageIndex]?.url || item.vault?.reference_image_url;
    const isOwner = user?.id === item.user_id;

    const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    {item.for_sale && item.price && (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <DollarSign className="w-3 h-3 mr-1" />
                            For Sale
                        </Badge>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Image Section with Gallery */}
                    <div className="space-y-3">
                        <div className="relative aspect-[4/5] max-h-[60vh] lg:max-h-[70vh] rounded-2xl overflow-hidden bg-secondary/50 border border-border/50">
                            {currentImage ? (
                                <img
                                    src={currentImage}
                                    alt={item.vault?.subject}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-8xl text-muted-foreground/20">👕</span>
                                </div>
                            )}

                            {/* Navigation arrows */}
                            {hasMultipleImages && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                                        {currentImageIndex + 1} / {images.length}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                                            }`}
                                    >
                                        <img src={img.url} alt={img.view} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="space-y-6">
                        {/* Title & Link to Vault */}
                        <div className="space-y-2">
                            <Link
                                href={`/vault/${item.vault_id}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                View in Vault Wiki <ExternalLink className="w-3 h-3" />
                            </Link>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{item.vault?.subject}</h1>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{item.vault?.category}</Badge>
                                {item.vault?.year && <Badge variant="secondary">{item.vault.year}</Badge>}
                            </div>
                        </div>

                        {/* Price (if for sale) */}
                        {item.for_sale && item.price && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <p className="text-sm text-green-500 font-medium">Asking Price</p>
                                <p className="text-3xl font-bold text-green-500">${item.price.toLocaleString()}</p>
                            </div>
                        )}

                        {/* Item Details */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Item Details</h3>

                            <div className="grid grid-cols-2 gap-3">
                                {item.size && (
                                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                        <p className="text-xs text-muted-foreground">Size</p>
                                        <p className="text-lg font-bold">{item.size}</p>
                                    </div>
                                )}
                                {item.condition && (
                                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                        <p className="text-xs text-muted-foreground">Condition</p>
                                        <p className="text-lg font-bold">{conditionLabels[item.condition] || item.condition}/10</p>
                                    </div>
                                )}
                            </div>

                            {/* Measurements */}
                            {item.measurements && (item.measurements.length || item.measurements.pit_to_pit) && (
                                <div className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Ruler className="w-4 h-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Measurements</p>
                                    </div>
                                    <div className="flex gap-4">
                                        {item.measurements.length && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Length</p>
                                                <p className="font-bold">{item.measurements.length}"</p>
                                            </div>
                                        )}
                                        {item.measurements.pit_to_pit && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">Pit to Pit</p>
                                                <p className="font-bold">{item.measurements.pit_to_pit}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tag Brand & Details */}
                            <div className="flex flex-wrap gap-2">
                                {item.vault?.tag_brand && item.vault.tag_brand.length > 0 && (
                                    item.vault.tag_brand.map((brand, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                            <Tag className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium">{brand}</span>
                                        </div>
                                    ))
                                )}
                                {item.tag && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{item.tag}</span>
                                    </div>
                                )}
                                {item.vault?.stitch_type && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                        <span className="text-sm font-medium">{item.vault.stitch_type} Stitch</span>
                                    </div>
                                )}
                                {(item.body_type || item.vault?.body_type) && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                        <span className="text-sm font-medium capitalize">{item.body_type || item.vault?.body_type}</span>
                                    </div>
                                )}
                                {item.material && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                        <span className="text-sm font-medium">{item.material}</span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {item.description && (
                                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                                    <p className="text-xs text-muted-foreground mb-2">Description</p>
                                    <p className="text-sm leading-relaxed">{item.description}</p>
                                </div>
                            )}

                            {/* Flaws */}
                            {item.flaws && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-500 font-semibold mb-2">⚠️ Noted Flaws</p>
                                    <p className="text-sm leading-relaxed text-amber-200">{item.flaws}</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {isOwner && (
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <Button variant="outline" className="w-full h-11">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Details
                                </Button>
                            </div>
                        )}

                        {/* Added date */}
                        <p className="text-xs text-muted-foreground">
                            Added {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
