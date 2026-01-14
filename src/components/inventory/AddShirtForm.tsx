"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Check,
    Plus,
    Loader2,
    ChevronDown,
    ChevronUp,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryImageUpload } from "@/components/inventory/InventoryImageUpload";

interface VaultMatch {
    id: string;
    subject: string;
    category: string;
    year: number | null;
    tag_brand: string[] | null;
}

interface AddShirtFormProps {
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
    initialImageUrls?: string[];
}

const categories = ['Music', 'Motorcycle', 'Movie', 'Art', 'Sport', 'Advertising', 'Other'];
const bodyTypes = ['t-shirt', 'long-sleeve', 'cutoff', 'jacket', 'hoodie', 'sweater', 'raglan', 'other'];
const listingTypes = [
    { value: 'collection', label: 'Not For Sale' },
    { value: 'offers', label: 'Open to Offers' },
    { value: 'for_sale', label: 'For Sale' },
];
const conditionOptions = [
    { value: 10, label: "10 - Deadstock" },
    { value: 9, label: "9 - Mint" },
    { value: 8, label: "8 - Excellent" },
    { value: 7, label: "7 - Good" },
    { value: 6, label: "6 - Fair" },
    { value: 5, label: "5 - Average" },
    { value: 4, label: "4 - Below Average" },
    { value: 3, label: "3 - Poor" },
    { value: 2, label: "2 - Bad" },
    { value: 1, label: "1 - Thrashed" },
];

export function AddShirtForm({ userId, onSuccess, onCancel, initialImageUrls = [] }: AddShirtFormProps) {
    // Core fields
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("Music");
    const [year, setYear] = useState("");

    // Garment details
    const [bodyType, setBodyType] = useState("t-shirt");
    const [tagBrand, setTagBrand] = useState("");
    const [origin, setOrigin] = useState("");
    const [stitchType, setStitchType] = useState("Single");

    // Inventory-specific
    const [size, setSize] = useState("");
    const [condition, setCondition] = useState(7);
    const [material, setMaterial] = useState("");
    const [flaws, setFlaws] = useState("");
    const [description, setDescription] = useState("");
    const [listingType, setListingType] = useState("collection");
    const [price, setPrice] = useState("");

    // Images
    const [images, setImages] = useState<{
        front: string | null;
        back: string | null;
        tag: string | null;
    }>({ front: null, back: null, tag: null });

    // Vault matching
    const [vaultMatches, setVaultMatches] = useState<VaultMatch[]>([]);
    const [selectedVault, setSelectedVault] = useState<VaultMatch | null>(null);
    const [searching, setSearching] = useState(false);

    // UI state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [loading, setLoading] = useState(false);

    // Debounced vault search
    const searchVault = useCallback(async (searchSubject: string) => {
        if (searchSubject.length < 2) {
            setVaultMatches([]);
            return;
        }

        setSearching(true);
        const { data, error } = await supabase
            .from('the_vault')
            .select('id, subject, category, year, tag_brand')
            .ilike('subject', `%${searchSubject}%`)
            .limit(5);

        if (!error && data) {
            setVaultMatches(data as VaultMatch[]);
        }
        setSearching(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (subject) searchVault(subject);
        }, 300);
        return () => clearTimeout(timer);
    }, [subject, searchVault]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject.trim()) {
            alert("Please enter a subject/name");
            return;
        }

        setLoading(true);

        let vaultId = selectedVault?.id;

        // If no vault match selected, always create vault entry
        if (!vaultId) {
            const { data: newVault, error: vaultError } = await supabase
                .from('the_vault')
                .insert({
                    subject,
                    category,
                    year: year ? parseInt(year) : null,
                    body_type: bodyType,
                    tag_brand: tagBrand ? tagBrand.split(',').map(t => t.trim()) : null,
                    origin: origin || null,
                    stitch_type: stitchType || null,
                    created_by: userId,
                })
                .select()
                .single();

            if (vaultError) {
                console.error(vaultError);
                alert("Error creating vault entry: " + vaultError.message);
                setLoading(false);
                return;
            }

            vaultId = newVault.id;

            // Award karma
            await supabase.from('contributions').insert({
                user_id: userId,
                vault_item_id: vaultId,
                action: 'create',
                points: 10,
            });
        }

        // Create inventory entry
        const { error: invError } = await supabase
            .from('user_inventory')
            .insert({
                vault_id: vaultId,
                user_id: userId,
                size: size || null,
                condition,
                price: listingType === 'for_sale' && price ? parseFloat(price) : null,
                for_sale: listingType === 'for_sale',
                body_type: bodyType,
                tag: tagBrand || null,
                material: material || null,
                flaws: flaws || null,
                description: description || null,
                front_image_url: images.front,
                back_image_url: images.back,
                tag_image_url: images.tag,
            });

        if (invError) {
            console.error(invError);
            alert("Error adding to collection: " + invError.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        onSuccess();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Add to Collection</h2>
                    <p className="text-sm text-muted-foreground">
                        {selectedVault
                            ? "Linked to existing vault entry"
                            : "Will create a new vault entry"}
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload - Front/Back/Tag */}
                <InventoryImageUpload
                    userId={userId}
                    images={images}
                    onImagesChange={setImages}
                />
                {/* Subject with vault search */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        What is it? <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <Input
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setSelectedVault(null);
                            }}
                            placeholder="e.g. Metallica Justice Tour 1988"
                            className="pr-10"
                            required
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    {/* Vault matches */}
                    {vaultMatches.length > 0 && !selectedVault && (
                        <div className="space-y-2 p-3 bg-secondary/30 rounded-xl border border-border/50 animate-in slide-in-from-top-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Search className="w-3 h-3" />
                                Found in Vault
                            </p>
                            {vaultMatches.map(match => (
                                <button
                                    key={match.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVault(match);
                                        setSubject(match.subject);
                                        if (match.category) setCategory(match.category);
                                        if (match.year) setYear(match.year.toString());
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/5 border border-border/50 hover:border-primary/30 transition-colors text-left"
                                >
                                    <div>
                                        <p className="font-medium">{match.subject}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {match.category} {match.year && `• ${match.year}`}
                                        </p>
                                    </div>
                                    <Check className="w-4 h-4 text-primary" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected vault match */}
                    {selectedVault && (
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium text-green-500">
                                    Linked to: {selectedVault.subject}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedVault(null)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    {/* New vault entry info */}
                    {!selectedVault && subject.length >= 2 && vaultMatches.length === 0 && !searching && (
                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm text-primary">
                                New entry — will be added to the Vault (+10 karma)
                            </span>
                        </div>
                    )}
                </div>

                {/* Category and Year */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            disabled={!!selectedVault}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <Input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="e.g. 1991"
                            disabled={!!selectedVault}
                        />
                    </div>
                </div>

                {/* Size and Condition */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Size</label>
                        <select
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                            <option value="">Select size</option>
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Condition</label>
                        <select
                            value={condition}
                            onChange={(e) => setCondition(parseInt(e.target.value))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                            {conditionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Body Type dropdown */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Body Type</label>
                    <select
                        value={bodyType}
                        onChange={(e) => setBodyType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm capitalize"
                    >
                        {bodyTypes.map(type => (
                            <option key={type} value={type} className="capitalize">{type}</option>
                        ))}
                    </select>
                </div>

                {/* Listing Type */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Listing Type</label>
                    <div className="grid grid-cols-3 gap-2">
                        {listingTypes.map(lt => (
                            <button
                                key={lt.value}
                                type="button"
                                onClick={() => setListingType(lt.value)}
                                className={cn(
                                    "py-3 px-4 rounded-xl text-sm font-medium border transition-colors",
                                    listingType === lt.value
                                        ? lt.value === 'for_sale'
                                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                                            : "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                {lt.label}
                            </button>
                        ))}
                    </div>

                    {/* Price input for For Sale */}
                    {listingType === 'for_sale' && (
                        <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                            <label className="text-sm font-medium">Asking Price ($)</label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="e.g. 150"
                            />
                        </div>
                    )}
                </div>

                {/* Advanced section */}
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    More Details
                </button>

                {showAdvanced && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tag Brand</label>
                                <Input
                                    value={tagBrand}
                                    onChange={(e) => setTagBrand(e.target.value)}
                                    placeholder="e.g. Giant, Hanes"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Material</label>
                                <Input
                                    value={material}
                                    onChange={(e) => setMaterial(e.target.value)}
                                    placeholder="e.g. 100% Cotton"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Flaws / Damage</label>
                            <Input
                                value={flaws}
                                onChange={(e) => setFlaws(e.target.value)}
                                placeholder="e.g. Small hole near collar, faded print"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Submit */}
                <div className="flex gap-4 pt-4">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" className="flex-1 h-12 font-bold" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Add to Collection
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
