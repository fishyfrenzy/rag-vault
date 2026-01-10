"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Check, AlertCircle, Sparkles, Link2, ChevronRight } from "lucide-react";

interface AnalysisResult {
    subject: string;
    category: string;
    year: number | null;
    year_range_start: number | null;
    year_range_end: number | null;
    tag_brand: string | null;
    confidence: number;
    description: string;
    matched_existing_subject?: boolean;
}

interface VaultMatch {
    id: string;
    subject: string;
    category: string;
    year: number | null;
    tag_brand: string | null;
    reference_image_url: string | null;
    similarity: number;
}

interface TagGuideMatch {
    id: string;
    brand_name: string;
    variation_name: string | null;
    era_start: number;
    era_end: number | null;
    description: string | null;
    reference_image_url: string | null;
}

interface SmartUploadProps {
    userId: string;
    onComplete: (vaultItemId: string, imageUrls: string[]) => void;
    onCancel: () => void;
}

type Step = "upload" | "analyzing" | "matches" | "confirm" | "saving" | "error";

export function SmartUpload({ userId, onComplete, onCancel }: SmartUploadProps) {
    const [step, setStep] = useState<Step>("upload");
    const [images, setImages] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [potentialMatches, setPotentialMatches] = useState<VaultMatch[]>([]);
    const [tagGuideMatch, setTagGuideMatch] = useState<TagGuideMatch | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<VaultMatch | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editable fields for user correction
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("");
    const [year, setYear] = useState("");
    const [tagBrand, setTagBrand] = useState("");

    const handleImagesReady = (files: File[]) => {
        setImages(files);
    };

    const uploadImages = async (): Promise<string[]> => {
        const urls: string[] = [];
        const timestamp = Date.now();

        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const path = `${userId}/${timestamp}/${i}-${file.name}`;

            const { error } = await supabase.storage
                .from("shirt-images")
                .upload(path, file);

            if (error) {
                console.error("Upload error:", error);
                throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
            }

            const { data: urlData } = supabase.storage
                .from("shirt-images")
                .getPublicUrl(path);

            urls.push(urlData.publicUrl);
        }

        return urls;
    };

    const analyzeImages = async () => {
        setStep("analyzing");
        setError(null);

        try {
            // Upload to Supabase Storage first
            const urls = await uploadImages();
            setImageUrls(urls);

            // Call analysis API
            const response = await fetch("/api/analyze-shirt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrls: urls }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Analysis failed");
            }

            const { analysis: result, potentialMatches: matches, tagGuideMatch: tagMatch } = await response.json();
            setAnalysis(result);
            setPotentialMatches(matches || []);
            setTagGuideMatch(tagMatch);

            // Pre-fill editable fields
            setSubject(result.subject);
            setCategory(result.category);
            setYear(result.year?.toString() || "");
            setTagBrand(result.tag_brand || "");

            // If we have potential matches, show match selection step
            if (matches && matches.length > 0) {
                setStep("matches");
            } else {
                setStep("confirm");
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed");
            setStep("error");
        }
    };

    const handleSelectMatch = (match: VaultMatch) => {
        setSelectedMatch(match);
        // Pre-fill fields from the match
        setSubject(match.subject);
        setCategory(match.category || category);
        setYear(match.year?.toString() || year);
        setTagBrand(match.tag_brand || tagBrand);
        setStep("confirm");
    };

    const handleCreateNew = () => {
        setSelectedMatch(null);
        // Restore AI analysis values
        if (analysis) {
            setSubject(analysis.subject);
            setCategory(analysis.category);
            setYear(analysis.year?.toString() || "");
            setTagBrand(analysis.tag_brand || "");
        }
        setStep("confirm");
    };

    const saveToVault = async () => {
        setStep("saving");

        try {
            let vaultItemId: string;

            if (selectedMatch) {
                // Use the selected existing vault item
                vaultItemId = selectedMatch.id;
            } else {
                // Search for existing vault item by subject
                const { data: existing } = await supabase
                    .from("the_vault")
                    .select("id")
                    .ilike("subject", subject)
                    .limit(1);

                if (existing && existing.length > 0) {
                    // Use existing vault item
                    vaultItemId = existing[0].id;
                } else {
                    // Create new vault item
                    const { data: newItem, error: createError } = await supabase
                        .from("the_vault")
                        .insert({
                            subject,
                            category,
                            year: year ? parseInt(year) : null,
                            tag_brand: tagBrand || null,
                            reference_image_url: imageUrls[0], // Use first image as reference
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    vaultItemId = newItem.id;
                }
            }

            onComplete(vaultItemId, imageUrls);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to save");
            setStep("error");
        }
    };

    return (
        <div className="space-y-6">
            {step === "upload" && (
                <>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold">Smart Upload</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Upload photos and AI will identify your shirt automatically.
                        </p>
                    </div>

                    <ImageUploader
                        onImagesReady={handleImagesReady}
                        minImages={2}
                        maxImages={8}
                    />

                    <div className="flex gap-4">
                        <Button variant="ghost" className="flex-1" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={analyzeImages}
                            disabled={images.length < 2}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze Photos
                        </Button>
                    </div>
                </>
            )}

            {step === "analyzing" && (
                <div className="py-12 text-center space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                    <div>
                        <p className="font-medium">Analyzing your shirt...</p>
                        <p className="text-sm text-muted-foreground">
                            AI is scanning database and identifying details
                        </p>
                    </div>
                </div>
            )}

            {step === "matches" && potentialMatches.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-amber-500">
                        <Link2 className="w-5 h-5" />
                        <span className="font-medium">
                            {potentialMatches.length} potential match{potentialMatches.length > 1 ? 'es' : ''} found
                        </span>
                    </div>

                    <div className="p-4 bg-secondary/30 rounded-lg space-y-1">
                        <p className="text-sm text-muted-foreground">AI identified:</p>
                        <p className="text-lg font-bold">{analysis?.subject}</p>
                        <p className="text-sm">{analysis?.description}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium">Is this one of these existing items?</p>

                        {potentialMatches.map((match) => (
                            <button
                                key={match.id}
                                onClick={() => handleSelectMatch(match)}
                                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                            >
                                {match.reference_image_url && (
                                    <img
                                        src={match.reference_image_url}
                                        alt={match.subject}
                                        className="w-16 h-16 object-cover rounded-md"
                                    />
                                )}
                                <div className="flex-1">
                                    <p className="font-medium">{match.subject}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {match.category} {match.year && `• ${match.year}`} {match.tag_brand && `• ${match.tag_brand}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                                        {match.similarity}% match
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleCreateNew}
                    >
                        None of these - Create new item
                    </Button>
                </div>
            )}

            {step === "confirm" && analysis && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-green-500">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">
                            {selectedMatch ? "Using existing item" : `${analysis.confidence}% confident match`}
                        </span>
                    </div>

                    <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {selectedMatch ? "Selected from database:" : "AI identified:"}
                        </p>
                        <p className="text-lg font-bold">{subject}</p>
                        <p className="text-sm">{analysis.description}</p>
                        {tagGuideMatch && (
                            <div className="mt-3 p-3 bg-primary/10 rounded-md border border-primary/20">
                                <div className="flex items-start gap-3">
                                    {tagGuideMatch.reference_image_url && (
                                        <img
                                            src={tagGuideMatch.reference_image_url}
                                            alt={`${tagGuideMatch.brand_name} tag`}
                                            className="w-16 h-16 object-cover rounded border border-primary/30"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-primary">
                                            🏷️ {tagGuideMatch.brand_name}
                                            {tagGuideMatch.variation_name && (
                                                <span className="text-xs ml-1 opacity-80">({tagGuideMatch.variation_name})</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Era: {tagGuideMatch.era_start} - {tagGuideMatch.era_end || 'present'}
                                        </p>
                                        {analysis.year_range_start && analysis.year_range_end && (
                                            <p className="text-xs text-green-500 mt-1">
                                                ✓ Shirt dated: {analysis.year_range_start}-{analysis.year_range_end}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-medium">
                            {selectedMatch ? "Confirm details:" : "Confirm or edit details:"}
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Subject</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={!!selectedMatch}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">Category</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    disabled={!!selectedMatch}
                                >
                                    {["Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"].map(
                                        (c) => (
                                            <option key={c} value={c} className="bg-background">
                                                {c}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">Year</label>
                                <input
                                    type="number"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    placeholder="1991"
                                    disabled={!!selectedMatch}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Tag Brand</label>
                            <input
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                value={tagBrand}
                                onChange={(e) => setTagBrand(e.target.value)}
                                placeholder="Giant, Hanes, etc."
                                disabled={!!selectedMatch}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="ghost" className="flex-1" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={saveToVault}>
                            <Check className="w-4 h-4 mr-2" />
                            Confirm &amp; Continue
                        </Button>
                    </div>
                </div>
            )}

            {step === "saving" && (
                <div className="py-12 text-center space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                    <p className="font-medium">Saving to vault...</p>
                </div>
            )}

            {step === "error" && (
                <div className="py-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                    <div>
                        <p className="font-medium">Something went wrong</p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    <Button variant="outline" onClick={() => setStep("upload")}>
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}
