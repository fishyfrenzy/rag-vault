"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AddShirtForm } from "@/components/inventory/AddShirtForm";
import { SmartUpload } from "@/components/upload/SmartUpload";
import { Sparkles, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "choose" | "smart" | "manual" | "success";

export default function SellPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("choose");
    const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <MobileContainer className="flex items-center justify-center h-screen">
                <p>Loading...</p>
            </MobileContainer>
        );
    }

    if (!user) return null;

    const handleSmartUploadComplete = (data: { vaultItemId?: string; imageUrls: string[] }) => {
        setUploadedImageUrls(data.imageUrls);
        setMode("manual"); // Go to manual form with images pre-filled
    };

    return (
        <MobileContainer className="p-6 space-y-6 pb-24">
            {mode === "choose" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Add to My Collection</h1>
                        <p className="text-lg text-muted-foreground max-w-[600px]">
                            Add a shirt to your collection. We'll check if it exists in the Vault.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* AI Vision Card */}
                        <button
                            onClick={() => setMode("smart")}
                            className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex flex-col h-full space-y-4">
                                <div className="p-3 rounded-xl bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors w-fit">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">AI Vision</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Scan with AI to auto-identify
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Manual Entry Card */}
                        <button
                            onClick={() => setMode("manual")}
                            className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 text-left hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex flex-col h-full space-y-4">
                                <div className="p-3 rounded-xl bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors w-fit">
                                    <PenLine className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Manual Entry</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Enter details yourself
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {mode === "smart" && (
                <div className="space-y-6">
                    <Button variant="ghost" onClick={() => setMode("choose")}>
                        ← Back
                    </Button>
                    <SmartUpload
                        userId={user.id}
                        onComplete={handleSmartUploadComplete}
                        onCancel={() => setMode("choose")}
                    />
                </div>
            )}

            {mode === "manual" && (
                <AddShirtForm
                    userId={user.id}
                    onSuccess={() => setMode("success")}
                    onCancel={() => {
                        setMode("choose");
                        setUploadedImageUrls([]);
                    }}
                    initialImageUrls={uploadedImageUrls}
                />
            )}

            {mode === "success" && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in zoom-in">
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center text-4xl">
                        ✓
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Added to Collection!</h2>
                        <p className="text-muted-foreground">
                            Your item has been saved.
                        </p>
                    </div>
                    <div className="w-full space-y-3 pt-6">
                        <Button
                            className="w-full"
                            onClick={() => {
                                setMode("choose");
                                setUploadedImageUrls([]);
                            }}
                        >
                            Add Another Item
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/my-collection")}
                        >
                            View My Collection
                        </Button>
                    </div>
                </div>
            )}
        </MobileContainer>
    );
}
