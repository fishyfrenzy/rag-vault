"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, Ruler } from "lucide-react";

function FormLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{children}</label>
}

interface VaultItem {
    id: string;
    subject: string;
    category: string;
    reference_image_url?: string;
}

interface InventoryFormProps {
    vaultItem: VaultItem;
    onSuccess: () => void;
    onCancel: () => void;
    userId: string;
    imageUrls?: string[];
}

export function InventoryForm({ vaultItem, onSuccess, onCancel, userId, imageUrls = [] }: InventoryFormProps) {
    const [size, setSize] = useState("L");
    const [condition, setCondition] = useState("Good");
    const [price, setPrice] = useState("");
    const [collectionId, setCollectionId] = useState<string | null>(null);
    const [collections, setCollections] = useState<{ id: string, name: string }[]>([]);
    const [length, setLength] = useState("");
    const [pitToPit, setPitToPit] = useState("");
    const [tagCondition, setTagCondition] = useState("Intact");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCollections = async () => {
            const { data } = await supabase
                .from('user_collections')
                .select('id, name')
                .order('name');
            if (data) setCollections(data);
        };
        fetchCollections();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const measurements = (length || pitToPit) ? {
            length: length ? parseFloat(length) : null,
            pit_to_pit: pitToPit ? parseFloat(pitToPit) : null
        } : null;

        // Format images as JSONB array: [{ view: "photo_1", url: "..." }]
        const formattedImages = imageUrls.length > 0
            ? imageUrls.map((url, idx) => ({ view: `photo_${idx + 1}`, url }))
            : null;

        const { data, error } = await supabase
            .from('user_inventory')
            .insert({
                user_id: userId,
                vault_id: vaultItem.id,
                size,
                condition: 7,
                price: price ? parseFloat(price) : null,
                for_sale: !!price,
                images: formattedImages,
                collection_id: collectionId,
                measurements,
                tag_condition: tagCondition
            })
            .select();

        if (error) {
            console.error("Supabase error:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            alert("Error adding to inventory: " + (error.message || error.details || JSON.stringify(error)));
        } else {
            console.log("Inventory item created:", data);
            onSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500 max-w-2xl mx-auto">
            <div className="flex items-center gap-5 p-6 border rounded-2xl bg-secondary/20 border-border/50">
                <div className="w-20 h-20 bg-muted rounded-xl shrink-0 overflow-hidden shadow-sm">
                    {vaultItem.reference_image_url ? (
                        <img src={vaultItem.reference_image_url} alt={vaultItem.subject} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary text-3xl">👕</div>
                    )}
                </div>
                <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Found in Vault</div>
                    <h3 className="text-xl font-bold tracking-tight">{vaultItem.subject}</h3>
                    <p className="text-sm text-muted-foreground">{vaultItem.category}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                {/* Sale & Collection Section */}
                <div className="space-y-4 p-6 bg-secondary/10 rounded-2xl border border-border/50">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FolderPlus className="w-4 h-4" /> Organization & Sale
                    </h3>

                    <div className="space-y-2">
                        <FormLabel>Add to Collection (Folder)</FormLabel>
                        <select
                            className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={collectionId || ""}
                            onChange={(e) => setCollectionId(e.target.value || null)}
                        >
                            <option value="">No Collection (Ungrouped)</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <FormLabel>Your Ask Price ($)</FormLabel>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                className="h-11 bg-background/50"
                            />
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Empty = Not for sale</p>
                        </div>
                        <div className="space-y-2">
                            <FormLabel>Condition</FormLabel>
                            <select
                                className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                            >
                                {['Deadstock', 'Mint', 'Excellent', 'Good', 'Fair', 'Poor', 'Thrashed'].map(c => (
                                    <option key={c} value={c} className="bg-background">{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Detailed Pro Specs Section */}
                <div className="space-y-4 p-6 bg-secondary/5 rounded-2xl border border-border/50">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Ruler className="w-4 h-4" /> Pro Specs
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <FormLabel>Size</FormLabel>
                            <select
                                className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                            >
                                {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => (
                                    <option key={s} value={s} className="bg-background">{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <FormLabel>Length (cm)</FormLabel>
                            <Input
                                type="number"
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                placeholder="72"
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <FormLabel>Pit-to-Pit (cm)</FormLabel>
                            <Input
                                type="number"
                                value={pitToPit}
                                onChange={(e) => setPitToPit(e.target.value)}
                                placeholder="54"
                                className="h-11 bg-background/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <FormLabel>Tag Condition</FormLabel>
                        <select
                            className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={tagCondition}
                            onChange={(e) => setTagCondition(e.target.value)}
                        >
                            {['Intact', 'Faded', 'Cut/Missing', 'Damaged'].map(t => (
                                <option key={t} value={t} className="bg-background">{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-4 pt-6 sticky bottom-6 bg-background/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-2xl">
                    <Button type="button" variant="ghost" className="flex-1 h-12" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-12 text-lg font-bold" disabled={loading}>
                        {loading ? "Adding..." : "Confirm & Add"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
