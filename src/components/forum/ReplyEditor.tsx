"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Image as ImageIcon } from "lucide-react";

interface ReplyEditorProps {
    onSave: (content: string) => Promise<void>;
    placeholder?: string;
    currentUserDisplayName?: string | null;
}

export function ReplyEditor({ onSave, placeholder = "Write a reply...", currentUserDisplayName }: ReplyEditorProps) {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSave(content);
            setContent("");
        } catch (error) {
            console.error("Failed to save post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 bg-card border border-border/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {currentUserDisplayName?.[0] || "U"}
                </div>
                <span className="text-sm font-semibold">Replying as {currentUserDisplayName || "User"}</span>
            </div>

            <div className="relative group">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    className="min-h-[150px] bg-secondary/30 border-border/40 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl resize-none p-4"
                />

                <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                        <Smile className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                        <ImageIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    Markdown supported
                </p>
                <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                    className="px-8 gap-2 rounded-xl"
                >
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    Post Reply
                </Button>
            </div>
        </div>
    );
}
