"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Plus, X, Camera, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";

interface VaultImage {
    id: string;
    image_url: string;
    image_type: "front" | "back" | "tag";
    is_primary: boolean;
    caption: string | null;
    upvotes: number;
    downvotes: number;
    score: number;
    user_vote: string | null;
}

interface VaultImageGalleryProps {
    vaultItemId: string;
    fallbackImageUrl?: string | null;
    className?: string;
}

type ImageType = "front" | "back" | "tag";

const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
    front: "Front",
    back: "Back",
    tag: "Tag"
};

export function VaultImageGallery({ vaultItemId, fallbackImageUrl, className }: VaultImageGalleryProps) {
    const { user } = useAuth();
    const [images, setImages] = useState<VaultImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState<ImageType>("front");
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [votingId, setVotingId] = useState<string | null>(null);

    // Fetch images
    const fetchImages = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc("get_vault_images", {
                p_vault_item_id: vaultItemId
            });

            if (error) {
                console.error("Error fetching images:", error);
                // Fallback: use the legacy reference_image_url
                if (fallbackImageUrl) {
                    setImages([{
                        id: "fallback",
                        image_url: fallbackImageUrl,
                        image_type: "front",
                        is_primary: true,
                        caption: null,
                        upvotes: 0,
                        downvotes: 0,
                        score: 0,
                        user_vote: null
                    }]);
                }
                return;
            }

            setImages(data || []);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, [vaultItemId, fallbackImageUrl]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    // Get images for current type
    const currentTypeImages = images.filter(img => img.image_type === activeType);
    const primaryImage = currentTypeImages.find(img => img.is_primary) || currentTypeImages[0];
    const alternativeImages = currentTypeImages.filter(img => !img.is_primary);

    // Get counts for each type
    const imageCounts = {
        front: images.filter(img => img.image_type === "front").length,
        back: images.filter(img => img.image_type === "back").length,
        tag: images.filter(img => img.image_type === "tag").length
    };

    // Handle vote
    const handleVote = async (imageId: string, voteType: "up" | "down") => {
        if (!user || imageId === "fallback") return;

        setVotingId(imageId);
        try {
            const { data, error } = await supabase.rpc("vote_vault_image", {
                p_image_id: imageId,
                p_vote: voteType
            });

            if (error) throw error;

            // Update local state
            setImages(prev => prev.map(img =>
                img.id === imageId
                    ? { ...img, upvotes: data.upvotes, downvotes: data.downvotes, score: data.score, user_vote: data.user_vote }
                    : img
            ));
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVotingId(null);
        }
    };

    // Navigate alternative images
    const navigateAlternatives = (direction: "prev" | "next") => {
        const maxIndex = alternativeImages.length;
        if (direction === "next") {
            setSelectedImageIndex(prev => (prev + 1) % (maxIndex + 1));
        } else {
            setSelectedImageIndex(prev => prev === 0 ? maxIndex : prev - 1);
        }
    };

    // Get the currently displayed image
    const displayedImage = selectedImageIndex === 0
        ? primaryImage
        : alternativeImages[selectedImageIndex - 1];

    if (loading) {
        return (
            <div className={cn("aspect-[4/5] bg-secondary/50 rounded-xl flex items-center justify-center", className)}>
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Fallback if no images at all
    if (!displayedImage && !fallbackImageUrl) {
        return (
            <div className={cn("aspect-[4/5] bg-secondary/50 rounded-xl flex flex-col items-center justify-center gap-3", className)}>
                <Camera className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No images yet</p>
                {user && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                        <Plus className="w-4 h-4" />
                        Add Image
                    </button>
                )}
            </div>
        );
    }

    const imageUrl = displayedImage?.image_url || fallbackImageUrl;

    return (
        <div className={cn("space-y-3", className)}>
            {/* Main Image Display */}
            <div className="relative aspect-[4/5] bg-secondary/50 rounded-xl overflow-hidden group">
                {imageUrl && (
                    <Image
                        src={imageUrl}
                        alt={`${activeType} view`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                    />
                )}

                {/* Navigation arrows for alternatives */}
                {alternativeImages.length > 0 && (
                    <>
                        <button
                            onClick={() => navigateAlternatives("prev")}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigateAlternatives("next")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* Image indicator dots */}
                {currentTypeImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {currentTypeImages.map((img, idx) => (
                            <button
                                key={img.id}
                                onClick={() => setSelectedImageIndex(idx)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    selectedImageIndex === idx
                                        ? "bg-white w-4"
                                        : "bg-white/50 hover:bg-white/75"
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Primary badge */}
                {displayedImage?.is_primary && currentTypeImages.length > 1 && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Primary
                    </div>
                )}

                {/* Add image button */}
                {user && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        title="Add image"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Image Type Tabs */}
            <div className="flex gap-2">
                {(["front", "back", "tag"] as ImageType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => {
                            setActiveType(type);
                            setSelectedImageIndex(0);
                        }}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                            activeType === type
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        {IMAGE_TYPE_LABELS[type]}
                        {imageCounts[type] > 0 && (
                            <span className="ml-1.5 text-xs opacity-70">
                                ({imageCounts[type]})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Voting Section (only if not the fallback) */}
            {displayedImage && displayedImage.id !== "fallback" && user && (
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleVote(displayedImage.id, "up")}
                            disabled={votingId === displayedImage.id}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors",
                                displayedImage.user_vote === "up"
                                    ? "text-green-500 bg-green-500/10"
                                    : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                            )}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{displayedImage.upvotes}</span>
                        </button>
                        <button
                            onClick={() => handleVote(displayedImage.id, "down")}
                            disabled={votingId === displayedImage.id}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors",
                                displayedImage.user_vote === "down"
                                    ? "text-red-500 bg-red-500/10"
                                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            )}
                        >
                            <ThumbsDown className="w-4 h-4" />
                            <span>{displayedImage.downvotes}</span>
                        </button>
                    </div>
                    {displayedImage.caption && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {displayedImage.caption}
                        </p>
                    )}
                </div>
            )}

            {/* Alternative thumbnails */}
            {alternativeImages.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Alternative {IMAGE_TYPE_LABELS[activeType]} Images
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {/* Primary thumbnail */}
                        <button
                            onClick={() => setSelectedImageIndex(0)}
                            className={cn(
                                "relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors",
                                selectedImageIndex === 0 ? "border-primary" : "border-transparent hover:border-border"
                            )}
                        >
                            {primaryImage && (
                                <Image
                                    src={primaryImage.image_url}
                                    alt="Primary"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </button>
                        {/* Alternative thumbnails */}
                        {alternativeImages.map((img, idx) => (
                            <button
                                key={img.id}
                                onClick={() => setSelectedImageIndex(idx + 1)}
                                className={cn(
                                    "relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors",
                                    selectedImageIndex === idx + 1 ? "border-primary" : "border-transparent hover:border-border"
                                )}
                            >
                                <Image
                                    src={img.image_url}
                                    alt={`Alternative ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Image Modal - TODO: Create separate component */}
            {showAddModal && (
                <AddVaultImageModal
                    vaultItemId={vaultItemId}
                    defaultType={activeType}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchImages();
                    }}
                />
            )}
        </div>
    );
}

// Simple Add Image Modal
interface AddVaultImageModalProps {
    vaultItemId: string;
    defaultType: ImageType;
    onClose: () => void;
    onSuccess: () => void;
}

function AddVaultImageModal({ vaultItemId, defaultType, onClose, onSuccess }: AddVaultImageModalProps) {
    const [imageType, setImageType] = useState<ImageType>(defaultType);
    const [caption, setCaption] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setError("Please select an image");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // Upload to Supabase storage
            setUploading(true);
            const ext = selectedFile.name.split('.').pop();
            const fileName = `${vaultItemId}/${imageType}/${Date.now()}.${ext}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault-images')
                .upload(fileName, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw new Error(uploadError.message);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('vault-images')
                .getPublicUrl(fileName);

            setUploading(false);

            // Add to database
            const { data, error: rpcError } = await supabase.rpc("add_vault_image", {
                p_vault_item_id: vaultItemId,
                p_image_url: publicUrl,
                p_image_type: imageType,
                p_caption: caption.trim() || null
            });

            if (rpcError) throw rpcError;
            if (data.error) throw new Error(data.error);

            onSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to add image");
        } finally {
            setSubmitting(false);
            setUploading(false);
        }
    };

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Add Image</h3>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Type */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Image Type</label>
                        <div className="flex gap-2">
                            {(["front", "back", "tag"] as ImageType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setImageType(type)}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                                        imageType === type
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {IMAGE_TYPE_LABELS[type]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Upload Image</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {previewUrl ? (
                            <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-secondary">
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    fill
                                    className="object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-[4/5] rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors"
                            >
                                <Camera className="w-8 h-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload</span>
                            </button>
                        )}
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-2">Caption (optional)</label>
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="e.g., Hanes tag variant"
                            className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:outline-none"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !selectedFile}
                        className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {uploading ? "Uploading..." : "Saving..."}
                            </>
                        ) : (
                            "Add Image"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

