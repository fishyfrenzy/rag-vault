"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

interface ImageSlot {
    label: string;
    field: "front" | "back" | "tag";
    required?: boolean;
}

const IMAGE_SLOTS: ImageSlot[] = [
    { label: "Front", field: "front", required: true },
    { label: "Back", field: "back" },
    { label: "Tag", field: "tag" }
];

interface InventoryImageUploadProps {
    userId: string;
    images: {
        front: string | null;
        back: string | null;
        tag: string | null;
    };
    onImagesChange: (images: { front: string | null; back: string | null; tag: string | null }) => void;
    className?: string;
}

export function InventoryImageUpload({ userId, images, onImagesChange, className }: InventoryImageUploadProps) {
    const [uploading, setUploading] = useState<string | null>(null);
    const fileInputRefs = {
        front: useRef<HTMLInputElement>(null),
        back: useRef<HTMLInputElement>(null),
        tag: useRef<HTMLInputElement>(null)
    };

    const handleUpload = async (field: "front" | "back" | "tag", file: File) => {
        if (!file) return;

        setUploading(field);

        try {
            // Generate unique filename
            const ext = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}_${field}.${ext}`;

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from('inventory-photos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('inventory-photos')
                .getPublicUrl(fileName);

            // Update images state
            onImagesChange({
                ...images,
                [field]: publicUrl
            });
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(null);
        }
    };

    const handleRemove = (field: "front" | "back" | "tag") => {
        onImagesChange({
            ...images,
            [field]: null
        });
    };

    return (
        <div className={cn("space-y-3", className)}>
            <label className="text-sm font-medium">Photos</label>
            <div className="grid grid-cols-3 gap-3">
                {IMAGE_SLOTS.map(({ label, field, required }) => (
                    <div key={field} className="relative">
                        <input
                            ref={fileInputRefs[field]}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(field, file);
                            }}
                            className="hidden"
                        />

                        {images[field] ? (
                            // Image preview
                            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-secondary border-2 border-primary/30">
                                <Image
                                    src={images[field]!}
                                    alt={label}
                                    fill
                                    className="object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemove(field)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                    <span className="text-xs font-medium text-white">{label}</span>
                                </div>
                            </div>
                        ) : (
                            // Upload button
                            <button
                                type="button"
                                onClick={() => fileInputRefs[field].current?.click()}
                                disabled={uploading === field}
                                className={cn(
                                    "w-full aspect-[4/5] rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2",
                                    required
                                        ? "border-primary/40 hover:border-primary hover:bg-primary/5"
                                        : "border-border/50 hover:border-border hover:bg-secondary/30"
                                )}
                            >
                                {uploading === field ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <Camera className={cn(
                                        "w-6 h-6",
                                        required ? "text-primary/60" : "text-muted-foreground/40"
                                    )} />
                                )}
                                <span className={cn(
                                    "text-xs font-medium",
                                    required ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {label}
                                    {required && <span className="text-destructive ml-0.5">*</span>}
                                </span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                Front image is required. Add back and tag photos for complete documentation.
            </p>
        </div>
    );
}
