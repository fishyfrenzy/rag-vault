"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader2, Upload } from "lucide-react";
import { SmartUpload } from "@/components/upload/SmartUpload";

interface ParentItem {
    id: string;
    brand: string | null;
    title: string | null;
    subject: string;
    reference_image_url: string | null;
}

interface AddVariantModalProps {
    parentItem: ParentItem;
    userId: string;
    onClose: () => void;
    onSuccess: (variantId: string) => void;
}

const VARIANT_TYPES = [
    { value: "graphic_change", label: "Graphic Change" },
    { value: "bootleg", label: "Bootleg" },
    { value: "color_variant", label: "Color Variant" },
    { value: "reprint", label: "Reprint" },
];

export function AddVariantModal({ parentItem, userId, onClose, onSuccess }: AddVariantModalProps) {
    const [step, setStep] = useState<"type" | "upload">("type");
    const [variantType, setVariantType] = useState<string>("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUploadComplete = async (uploadData: { vaultItemId?: string; imageUrls: string[] }) => {
        const urls = uploadData.imageUrls;
        if (urls.length === 0) {
            setError("Please upload an image");
            return;
        }

        setSubmitting(true);
        setError(null);

        // Create the variant
        const { data, error: insertError } = await supabase
            .from("the_vault")
            .insert({
                brand: parentItem.brand,
                title: parentItem.title,
                subject: parentItem.subject,
                category: "Music", // Default, could be passed from parent
                parent_id: parentItem.id,
                variant_type: variantType,
                description: description || null,
                reference_image_url: urls[0],
                created_by: userId,
            })
            .select("id")
            .single();

        if (insertError) {
            console.error("Error creating variant:", insertError);
            setError("Failed to create variant");
            setSubmitting(false);
            return;
        }

        onSuccess(data.id);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Add Variant</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Parent Info */}
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                        {parentItem.reference_image_url ? (
                            <img
                                src={parentItem.reference_image_url}
                                alt={parentItem.subject}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">👕</div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Variant of</p>
                        <p className="font-medium truncate">{parentItem.subject}</p>
                    </div>
                </div>

                {step === "type" ? (
                    <>
                        {/* Variant Type Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium">What type of variant is this?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {VARIANT_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setVariantType(type.value)}
                                        className={`p-3 rounded-lg border text-left text-sm transition-colors ${variantType === type.value
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Optional Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (optional)</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What makes this variant different?"
                                className="bg-background/50"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => setStep("upload")}
                                disabled={!variantType}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Image Upload */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Upload variant image</label>
                                <Button variant="ghost" size="sm" onClick={() => setStep("type")}>
                                    Back
                                </Button>
                            </div>
                            <SmartUpload
                                userId={userId}
                                onComplete={handleImageUploadComplete}
                                onCancel={() => setStep("type")}
                                embedded={true}
                                minImages={1}
                                maxImages={1}
                            />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        {submitting && (
                            <div className="flex items-center justify-center gap-2 py-4">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Creating variant...</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
