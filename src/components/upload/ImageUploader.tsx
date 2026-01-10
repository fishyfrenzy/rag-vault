"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageFile {
    file: File;
    preview: string;
    id: string;
}

interface ImageUploaderProps {
    onImagesReady: (files: File[]) => void;
    minImages?: number;
    maxImages?: number;
    disabled?: boolean;
}

export function ImageUploader({
    onImagesReady,
    minImages = 2,
    maxImages = 10,
    disabled = false,
}: ImageUploaderProps) {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newImages: ImageFile[] = [];
        const remainingSlots = maxImages - images.length;

        for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
            const file = files[i];
            if (file.type.startsWith("image/")) {
                newImages.push({
                    file,
                    preview: URL.createObjectURL(file),
                    id: `${Date.now()}-${i}`,
                });
            }
        }

        const updated = [...images, ...newImages];
        setImages(updated);

        if (updated.length >= minImages) {
            onImagesReady(updated.map((img) => img.file));
        }
    }, [images, maxImages, minImages, onImagesReady]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    }, []);

    const removeImage = useCallback((id: string) => {
        setImages((prev) => {
            const updated = prev.filter((img) => img.id !== id);
            if (updated.length >= minImages) {
                onImagesReady(updated.map((img) => img.file));
            }
            return updated;
        });
    }, [minImages, onImagesReady]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-border",
                    disabled && "opacity-50 pointer-events-none"
                )}
            >
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={disabled || images.length >= maxImages}
                />

                <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                            <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>

                    <div>
                        <p className="font-medium">Drop photos here or tap to upload</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Minimum {minImages} photos (front &amp; back required)
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((img, index) => (
                        <div key={img.id} className="relative aspect-square">
                            <img
                                src={img.preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                                onClick={() => removeImage(img.id)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {index === 0 && (
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                                    Front
                                </span>
                            )}
                            {index === 1 && (
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                                    Back
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between text-sm">
                <span className={cn(
                    "text-muted-foreground",
                    images.length >= minImages && "text-green-500"
                )}>
                    {images.length} / {maxImages} photos
                    {images.length < minImages && ` (need ${minImages - images.length} more)`}
                </span>

                {images.length >= minImages && (
                    <Button size="sm" disabled={disabled}>
                        <Upload className="w-4 h-4 mr-2" />
                        Analyze Photos
                    </Button>
                )}
            </div>
        </div>
    );
}
