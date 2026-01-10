"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, FolderPlus } from "lucide-react";

interface CollectionData {
    id: string;
    name: string;
    color: string;
    is_private: boolean;
}

interface CreateCollectionModalProps {
    userId: string;
    onClose: () => void;
    onSuccess?: () => void;
    onCreated?: (collection: CollectionData) => void;
}

export function CreateCollectionModal({ userId, onClose, onSuccess, onCreated }: CreateCollectionModalProps) {
    const [name, setName] = useState("");
    const [description] = useState(""); // Description field to be added to UI later
    const [color, setColor] = useState("#9333ea");
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);

    const colors = [
        "#9333ea", // Purple
        "#3b82f6", // Blue
        "#ef4444", // Red
        "#f59e0b", // Amber
        "#10b981", // Emerald
        "#6366f1", // Indigo
        "#ec4899", // Pink
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase
            .from('user_collections')
            .insert({
                user_id: userId,
                name,
                description,
                color,
                is_private: isPrivate
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Error creating collection: " + error.message);
        } else {
            if (onCreated && data) {
                onCreated(data as CollectionData);
            }
            onSuccess?.();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-border/50 flex items-center justify-between bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                            <FolderPlus className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">New Collection</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mr-2">Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g. 90s Movie Tees"
                                className="h-11 bg-secondary/30 border-border/50 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground mr-2">Color Theme</label>
                            <div className="flex gap-2 py-2">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-primary scale-110 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-secondary/30 p-4 rounded-2xl border border-border/50">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="isPrivate" className="text-sm font-medium leading-none cursor-pointer">
                                Private Collection (Only you can see this)
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1 h-11 font-bold" disabled={loading}>
                            {loading ? "Creating..." : "Create Folder"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
