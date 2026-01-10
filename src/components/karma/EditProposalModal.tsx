"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send } from "lucide-react";

interface EditProposalModalProps {
    vaultItemId: string;
    userId: string;
    currentValues: {
        subject: string;
        category: string;
        year: number | null;
        tag_brand: string | null;
    };
    onClose: () => void;
    onSuccess: () => void;
}

const EDITABLE_FIELDS = [
    { key: "subject", label: "Subject / Band Name", type: "text" },
    { key: "category", label: "Category", type: "select", options: ["Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"] },
    { key: "year", label: "Year", type: "number" },
    { key: "tag_brand", label: "Tag Brand", type: "text" },
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

    const handleSubmit = async () => {
        if (!selectedField || !newValue.trim()) {
            setError("Please select a field and enter a new value");
            return;
        }

        const oldValue = currentValues[selectedField as keyof typeof currentValues];
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

    const selectedFieldInfo = EDITABLE_FIELDS.find((f) => f.key === selectedField);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Suggest an Edit</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

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
                                }}
                                className={`p-3 rounded-lg border text-left text-sm transition-colors ${selectedField === field.key
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    }`}
                            >
                                <p className="font-medium">{field.label}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {String(currentValues[field.key as keyof typeof currentValues] || "Not set")}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* New Value Input */}
                {selectedField && (
                    <div className="space-y-2">
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
                        ) : (
                            <Input
                                type={selectedFieldInfo?.type || "text"}
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder={`Enter new ${selectedFieldInfo?.label.toLowerCase()}`}
                            />
                        )}

                        <p className="text-xs text-muted-foreground">
                            Current: {String(currentValues[selectedField as keyof typeof currentValues] || "Not set")}
                        </p>
                    </div>
                )}

                {/* Error */}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3">
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
            </div>
        </div>
    );
}
