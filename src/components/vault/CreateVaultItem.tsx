"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/TagInput";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ImageUploader } from "@/components/upload/ImageUploader";

function FormLabel({ children, required }: { children: React.ReactNode, required?: boolean }) {
    return (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {children}
            {required && <span className="text-destructive ml-1">*</span>}
        </label>
    );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 transition-colors"
            >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isOpen && (
                <div className="p-6 space-y-4 bg-secondary/5 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

interface CreateVaultItemProps {
    initialSubject: string;
    onSuccess: (item: { id: string, subject: string, category: string }) => void;
    onCancel: () => void;
    userId?: string;
}

export function CreateVaultItem({ initialSubject, onSuccess, onCancel, userId }: CreateVaultItemProps) {
    // Core Information (Required)
    const [brand, setBrand] = useState("");
    const [title, setTitle] = useState(initialSubject || "");
    const [category, setCategory] = useState("Music");
    const [years, setYears] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Garment Details (Optional)
    const [garmentType, setGarmentType] = useState("t-shirt");
    const [stitchType, setStitchType] = useState("Single");
    const [origin, setOrigin] = useState("");
    const [tagBrands, setTagBrands] = useState<string[]>([]);

    // Tags
    const [tags, setTags] = useState<string[]>([]);

    // Description (Wiki content)
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!brand.trim() || !title.trim() || !category) {
            alert("Please fill all required fields (Brand, Title, Category).");
            return;
        }

        setLoading(true);

        try {
            let referenceImageUrl = null;

            // Upload Image if present
            if (imageFile && userId) {
                const fileExt = imageFile.name.split('.').pop();
                const filePath = `${userId}/${Date.now()}/reference.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('shirt-images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('shirt-images')
                    .getPublicUrl(filePath);

                referenceImageUrl = urlData.publicUrl;
            }

            const { data, error } = await supabase
                .from('the_vault')
                .insert({
                    brand: brand.trim(),
                    title: title.trim(),
                    subject: `${brand.trim()} ${title.trim()}`, // Keep subject as computed for backwards compatibility
                    category,
                    year: years.length > 0 ? years.join(', ') : null,
                    tag_brand: tagBrands.length > 0 ? tagBrands : null,
                    tags: tags.length > 0 ? tags : null,
                    stitch_type: stitchType || null,
                    origin: origin || null,
                    body_type: garmentType || null,
                    created_by: userId || null,
                    description: description || null,
                    reference_image_url: referenceImageUrl,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Add contribution for creating a vault entry
            if (userId) {
                await supabase.from('contributions').insert({
                    user_id: userId,
                    vault_item_id: data.id,
                    action: 'create',
                    points: 10,
                });
            }
            onSuccess(data);

        } catch (error: any) {
            console.error(error);
            alert("Error creating item: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">New Vault Entry</h2>
                    <p className="text-sm text-muted-foreground">
                        Add a shirt type to the global wiki database.
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Core Information - Required */}
                <div className="space-y-4 p-6 bg-primary/5 rounded-2xl border-2 border-primary/20">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Core Information</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-primary/10 text-primary rounded">Required</span>
                    </div>

                    <div className="space-y-2">
                        <FormLabel required>Brand / Artist</FormLabel>
                        <Input
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            required
                            placeholder="e.g. Nirvana, Harley-Davidson, Nike"
                            className="bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">The main entity featured on the shirt</p>
                    </div>

                    <div className="space-y-2">
                        <FormLabel required>Title</FormLabel>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Heart Shaped Box, In Utero Tour"
                            className="bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">The specific design or tour name</p>
                    </div>

                    <div className="space-y-2">
                        <FormLabel required>Category</FormLabel>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                        >
                            {['Music', 'Motorcycle', 'Movie', 'Art', 'Sport', 'Advertising', 'Other'].map(c => (
                                <option key={c} value={c} className="bg-background">{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <FormLabel>Year(s)</FormLabel>
                        <TagInput
                            value={years}
                            onChange={setYears}
                            placeholder="Type a year and press Enter (e.g. 1988)"
                            maxItems={20}
                        />
                        <p className="text-xs text-muted-foreground">Press Enter after each year</p>
                    </div>
                </div>

                {/* Main Image */}
                <CollapsibleSection title="Main Reference Image" defaultOpen>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Upload a clear photo of the shirt (front view preferred) to serve as the main reference image.
                        </p>
                        <ImageUploader
                            onImagesReady={(files) => setImageFile(files[0])}
                            minImages={1}
                            maxImages={1}
                        />
                    </div>
                </CollapsibleSection>

                {/* Tags */}
                <CollapsibleSection title="Tags" defaultOpen>
                    <div className="space-y-2">
                        <FormLabel>Tags (up to 10)</FormLabel>
                        <TagInput
                            value={tags}
                            onChange={setTags}
                            placeholder="Type a tag and press Enter"
                            maxItems={10}
                        />
                        <p className="text-xs text-muted-foreground">Add keywords like "bootleg", "tour", "pushead", "all-over-print"</p>
                    </div>
                </CollapsibleSection>

                {/* Garment Details - Optional */}
                <CollapsibleSection title="Garment Details">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <FormLabel>Garment Type</FormLabel>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={garmentType}
                                onChange={(e) => setGarmentType(e.target.value)}
                            >
                                {['t-shirt', 'long-sleeve', 'cutoff', 'jacket', 'hoodie', 'sweater', 'raglan', 'other'].map(t => (
                                    <option key={t} value={t} className="bg-background capitalize">{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <FormLabel>Stitch Type</FormLabel>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={stitchType}
                                onChange={(e) => setStitchType(e.target.value)}
                            >
                                {['Single', 'Double', 'Mixed', 'Other'].map(s => (
                                    <option key={s} value={s} className="bg-background">{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <FormLabel>Made In</FormLabel>
                        <Input
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            placeholder="e.g. USA, Mexico, Honduras"
                            className="bg-background/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <FormLabel>Tag Brand(s)</FormLabel>
                        <TagInput
                            value={tagBrands}
                            onChange={setTagBrands}
                            placeholder="Type a brand and press Enter (e.g. Giant)"
                            maxItems={5}
                        />
                        <p className="text-xs text-muted-foreground">Press Enter after each brand</p>
                    </div>
                </CollapsibleSection>

                {/* Description - Wiki Content */}
                <CollapsibleSection title="Description" defaultOpen>
                    <div className="space-y-2">
                        <FormLabel>Wiki Description</FormLabel>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe this shirt for the wiki... Tour dates, design details, notable features, historical context, bootleg variations, etc."
                            rows={6}
                            className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Help the community by providing useful information about this shirt type.
                        </p>
                    </div>
                </CollapsibleSection>

                {/* Submit */}
                <div className="flex gap-4 pt-4 sticky bottom-4 bg-background/90 backdrop-blur-md p-4 rounded-xl border border-border shadow-2xl">
                    <Button type="button" variant="outline" className="flex-1 h-12 text-lg" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-12 text-lg font-bold" disabled={loading}>
                        {loading ? "Creating..." : "Add to Vault"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

