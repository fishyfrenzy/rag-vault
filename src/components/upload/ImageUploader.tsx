"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="space-y-6">
            {/* Drop Zone */}
            <motion.div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                animate={{
                    scale: dragActive ? 1.02 : 1,
                    borderColor: dragActive ? "var(--primary)" : "var(--border)",
                    backgroundColor: dragActive ? "rgba(var(--primary), 0.05)" : "transparent"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer overflow-hidden",
                    "hover:border-primary/50 hover:bg-primary/5 transition-colors duration-300",
                    disabled && "opacity-50 pointer-events-none"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={disabled || images.length >= maxImages}
                />

                <div className="space-y-4 relative z-0">
                    <motion.div
                        className="flex justify-center gap-4"
                        animate={{ y: dragActive ? -5 : 0 }}
                    >
                        <div className="w-14 h-14 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-border/50">
                            <Camera className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="w-14 h-14 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-border/50">
                            <ImageIcon className="w-7 h-7 text-muted-foreground" />
                        </div>
                    </motion.div>

                    <div className="space-y-1">
                        <p className="font-semibold text-lg tracking-tight">Drop photos here or tap to upload</p>
                        <p className="text-sm text-muted-foreground">
                            {minImages > 1
                                ? `Minimum ${minImages} photos (Front, Back, & Tag required)`
                                : "Upload a photo"
                            }
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Preview Grid */}
            {images.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 sm:grid-cols-4 gap-3"
                >
                    <AnimatePresence>
                        {images.map((img, index) => (
                            <motion.div
                                key={img.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                className="relative aspect-square group"
                            >
                                <img
                                    src={img.preview}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-full object-cover rounded-xl shadow-sm border border-border/50"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                <button
                                    onClick={() => removeImage(img.id)}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 sm:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                {index === 0 && (
                                    <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-semibold bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-md shadow-sm">
                                        Front
                                    </span>
                                )}
                                {index === 1 && (
                                    <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-semibold bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-md shadow-sm">
                                        Back
                                    </span>
                                )}
                                {index === 2 && (
                                    <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-semibold bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-md shadow-sm">
                                        Tag
                                    </span>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between text-sm px-1">
                <span className={cn(
                    "font-medium transition-colors",
                    images.length >= minImages ? "text-primary" : "text-muted-foreground"
                )}>
                    {images.length} / {maxImages} photos
                    {images.length < minImages && <span className="opacity-70 font-normal"> (need {minImages - images.length} more)</span>}
                </span>

                {images.length >= minImages && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Button size="sm" disabled={disabled} className="rounded-full shadow-sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Ready
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
