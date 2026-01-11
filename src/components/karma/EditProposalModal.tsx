"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { SmartUpload } from "@/components/upload/SmartUpload";

interface EditProposalModalProps {
    vaultItemId: string;
    userId: string;
    currentValues: {
        brand: string | null;
        title: string | null;
        subject: string;
        category: string;
        year: string | number | null;
        tag_brand: string | null;
        description: string | null;
        reference_image_url?: string | null;
    };
    onClose: () => void;
    onSuccess: () => void;
}

const EDITABLE_FIELDS = [
    { key: "brand", label: "Brand / Artist", type: "text", placeholder: "e.g. Nirvana, Harley-Davidson" },
    { key: "title", label: "Title", type: "text", placeholder: "e.g. Heart Shaped Box, In Utero Tour" },
    { key: "category", label: "Category", type: "select", options: ["Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"] },
    { key: "year", label: "Year (or Range)", type: "text", placeholder: "e.g. 1988 or 1988-1991" },
    { key: "tag_brand", label: "Tag Brand", type: "text" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Detailed description of the shirt..." },
    { key: "reference_image_url", label: "Main Image", type: "image" },
];

export function EditProposalModal({
    vaultItemId,
    userId,
    currentValues,
    onClose,
    onSuccess,
}: EditProposalModalProps) {
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [newValue, setNewValue] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showImageUpload, setShowImageUpload] = useState(false);

    const handleSubmit = async () => {
        if (!selectedField || !newValue.trim()) {
            setError("Please select a field and enter a new value");
            return;
        }

        const oldValue = currentValues[selectedField as keyof typeof currentValues];
        // For images, we don't strictly check equality as URL params might change, but simple string check is fine for now
        if (String(oldValue || "") === newValue.trim()) {
            setError("New value is the same as current value");
            return;
        }

        setSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase.from("edit_proposals").insert({
            vault_item_id: vaultItemId,
            user_id: userId,
            field_name: selectedField,
            old_value: oldValue ? String(oldValue) : null,
            new_value: newValue.trim(),
        });

        if (insertError) {
            console.error("Error submitting edit:", insertError);
            setError("Failed to submit edit proposal");
            setSubmitting(false);
            return;
        }

        onSuccess();
    };

    const handleImageUploadComplete = (vaultId: string, urls: string[]) => {
        if (urls.length > 0) {
            setNewValue(urls[0]);
            setShowImageUpload(false);
        }
    };

    const selectedFieldInfo = EDITABLE_FIELDS.find((f) => f.key === selectedField);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Suggest an Edit</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {!showImageUpload ? (
                    <>
                        {/* Field Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">What would you like to change?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {EDITABLE_FIELDS.map((field) => (
                                    <button
                                        key={field.key}
                                        onClick={() => {
                                            setSelectedField(field.key);
                                            setNewValue("");
                                            setError(null);
                                        }}
                                        className={`p-3 rounded-lg border text-left text-sm transition-colors ${selectedField === field.key
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {field.type === "image" && <ImageIcon className="w-3 h-3 text-primary" />}
                                            <p className="font-medium">{field.label}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {field.key === "reference_image_url"
                                                ? (currentValues.reference_image_url ? "Image set" : "No image")
                                                : String(currentValues[field.key as keyof typeof currentValues] || "Not set")
                                            }
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* New Value Input */}
                        {selectedField && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-sm font-medium">New value for {selectedFieldInfo?.label}</label>

                                {selectedFieldInfo?.type === "select" ? (
                                    <select
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                    >
                                        <option value="">Select...</option>
                                        {selectedFieldInfo.options?.map((opt) => (
                                            <option key={opt} value={opt} className="bg-background">
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                ) : selectedFieldInfo?.type === "image" ? (
                                    <div className="space-y-3">
                                        {newValue ? (
                                            <div className="relative aspect-[4/5] w-32 rounded-lg overflow-hidden border border-border">
                                                <img src={newValue} alt="New proposal" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setNewValue("")}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                className="w-full h-24 border-dashed flex flex-col gap-2"
                                                onClick={() => setShowImageUpload(true)}
                                            >
                                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                                <span>Upload New Image</span>
                                            </Button>
                                        )}
                                    </div>
                                ) : selectedFieldInfo?.type === "textarea" ? (
                                    <textarea
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        placeholder={selectedFieldInfo?.placeholder || `Enter new ${selectedFieldInfo?.label.toLowerCase()}`}
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
                                        rows={4}
                                    />
                                ) : (
                                    <Input
                                        type={selectedFieldInfo?.type === "number" ? "number" : "text"}
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        placeholder={selectedFieldInfo?.placeholder || `Enter new ${selectedFieldInfo?.label.toLowerCase()}`}
                                    />
                                )}

                                {selectedFieldInfo?.type !== "image" && (
                                    <p className="text-xs text-muted-foreground">
                                        Current: {String(currentValues[selectedField as keyof typeof currentValues] || "Not set")}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && <p className="text-sm text-destructive">{error}</p>}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={!selectedField || !newValue.trim() || submitting}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {submitting ? "Submitting..." : "Submit Edit"}
                            </Button>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            Your edit will be reviewed by trusted community members.
                            You&apos;ll earn +3 karma if approved.
                        </p>
                    </>
                ) : (
                    // Image Upload View
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Upload Image</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowImageUpload(false)}>Cancel</Button>
                        </div>
                        <SmartUpload
                            userId={userId}
                            onComplete={handleImageUploadComplete}
                            onCancel={() => setShowImageUpload(false)}
                            embedded={true} // Add this prop to SmartUpload if it doesn't exist, or wrapper might be needed
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
