"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface InlineEditFieldProps {
    vaultItemId: string;
    fieldName: string;
    fieldLabel: string;
    currentValue: string | null | undefined;
    fieldType?: "text" | "textarea" | "select" | "number";
    options?: { value: string; label: string }[];
    placeholder?: string;
    onUpdate?: (newValue: string) => void;
    className?: string;
    renderValue?: (value: string | null | undefined) => React.ReactNode;
}

export function InlineEditField({
    vaultItemId,
    fieldName,
    fieldLabel,
    currentValue,
    fieldType = "text",
    options,
    placeholder,
    onUpdate,
    className,
    renderValue
}: InlineEditFieldProps) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(currentValue || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (value === currentValue) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Create edit proposal for tracking/karma
            const { error: proposalError } = await supabase
                .from('edit_proposals')
                .insert({
                    vault_item_id: vaultItemId,
                    user_id: user?.id,
                    field_name: fieldName,
                    old_value: currentValue || null,
                    new_value: value || null,
                    status: 'applied' // Auto-apply for now
                });

            if (proposalError) console.warn("Proposal log error:", proposalError);

            // Apply the edit directly
            const { error: updateError } = await supabase
                .from('the_vault')
                .update({ [fieldName]: value || null })
                .eq('id', vaultItemId);

            if (updateError) throw updateError;

            // Award karma for contribution (ignore errors)
            await supabase.from('contributions').insert({
                user_id: user?.id,
                vault_item_id: vaultItemId,
                action: 'edit',
                points: 2,
            });

            onUpdate?.(value);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setValue(currentValue || "");
        setIsEditing(false);
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && fieldType !== "textarea") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    // Display mode
    if (!isEditing) {
        return (
            <div className={cn("group relative", className)}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {renderValue ? (
                            renderValue(currentValue)
                        ) : currentValue ? (
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {currentValue}
                            </p>
                        ) : (
                            <p className="text-muted-foreground/50 italic text-sm">
                                No {fieldLabel.toLowerCase()} yet
                            </p>
                        )}
                    </div>
                    {user && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title={`Edit ${fieldLabel}`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Edit mode
    return (
        <div className={cn("space-y-2", className)}>
            {fieldType === "textarea" ? (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-primary/30 focus:border-primary focus:outline-none text-sm resize-none"
                    disabled={saving}
                />
            ) : fieldType === "select" && options ? (
                <select
                    ref={inputRef as React.RefObject<HTMLSelectElement>}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-primary/30 focus:border-primary focus:outline-none text-sm"
                    disabled={saving}
                >
                    <option value="">Select {fieldLabel.toLowerCase()}...</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={fieldType === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-primary/30 focus:border-primary focus:outline-none text-sm"
                    disabled={saving}
                />
            )}

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Check className="w-3 h-3" />
                    )}
                    Save
                </button>
                <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground disabled:opacity-50"
                >
                    <X className="w-3 h-3" />
                    Cancel
                </button>
            </div>
        </div>
    );
}

// Wrapper for section with edit capability
interface EditableSectionProps {
    label: string;
    vaultItemId: string;
    fieldName: string;
    currentValue: string | null | undefined;
    fieldType?: "text" | "textarea" | "select" | "number";
    options?: { value: string; label: string }[];
    placeholder?: string;
    onUpdate?: (newValue: string) => void;
    className?: string;
    children?: React.ReactNode;
}

export function EditableSection({
    label,
    vaultItemId,
    fieldName,
    currentValue,
    fieldType,
    options,
    placeholder,
    onUpdate,
    className,
    children
}: EditableSectionProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
            </h3>
            {children || (
                <InlineEditField
                    vaultItemId={vaultItemId}
                    fieldName={fieldName}
                    fieldLabel={label}
                    currentValue={currentValue}
                    fieldType={fieldType}
                    options={options}
                    placeholder={placeholder}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
}
