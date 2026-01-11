"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePathname } from "next/navigation";

export function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setSubmitting(true);

        const { error } = await supabase.from("feedback").insert({
            user_id: user?.id || null,
            message: message.trim(),
            page_url: pathname,
        });

        setSubmitting(false);

        if (!error) {
            setSubmitted(true);
            setMessage("");
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
            }, 2000);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-6 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                aria-label="Send Feedback"
            >
                <MessageSquare className="w-5 h-5" />
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Send Feedback</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {submitted ? (
                            <div className="text-center py-8 space-y-2">
                                <div className="text-4xl">🙏</div>
                                <p className="text-muted-foreground">Thanks for your feedback!</p>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="What's on your mind? Bug reports, feature requests, or just say hi..."
                                    rows={4}
                                    className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                    autoFocus
                                />

                                <div className="flex gap-3">
                                    <Button variant="ghost" className="flex-1" onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        onClick={handleSubmit}
                                        disabled={!message.trim() || submitting}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Send
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <p className="text-xs text-center text-muted-foreground">
                                    {user ? "Sending as logged in user" : "Sending anonymously"}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
