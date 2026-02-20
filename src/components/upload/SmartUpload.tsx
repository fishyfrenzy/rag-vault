"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Check, AlertCircle, Sparkles, Link2, ChevronRight, Upload as UploadIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

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
    embedded?: boolean;
    minImages?: number;
    maxImages?: number;
}

type Step = "upload" | "analyzing" | "matches" | "confirm" | "saving" | "error";

export function SmartUpload({ userId, onComplete, onCancel, embedded = false, minImages = 2, maxImages = 8 }: SmartUploadProps) {
    const [step, setStep] = useState<Step>("upload");
    const [images, setImages] = useState<File[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [potentialMatches, setPotentialMatches] = useState<VaultMatch[]>([]);
    const [tagGuideMatch, setTagGuideMatch] = useState<TagGuideMatch | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<VaultMatch | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState("Preparing images...");

    const loadingSequence = [
        "Analyzing stitching and hems...",
        "Scanning for hidden copyrights...",
        "Identifying artwork motifs...",
        "Cross-referencing tag database...",
        "Consulting the archives...",
        "Finalizing estimates..."
    ];

    useEffect(() => {
        if (step === "analyzing") {
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % loadingSequence.length;
                setLoadingText(loadingSequence[index]);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [step]);

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

            // If embedded, we skip analysis matching and just return the URLs to the parent
            if (embedded) {
                onComplete("", urls);
                return;
            }

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

    const slideVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return (
        <div className={embedded ? "space-y-4" : "space-y-6"}>
            <AnimatePresence mode="wait">
                {step === "upload" && (
                    <motion.div key="upload" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="space-y-2">
                            {!embedded && (
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Smart Upload</h2>
                                </div>
                            )}
                            {!embedded && (
                                <p className="text-sm text-muted-foreground">
                                    Upload photos and let our AI appraise and catalog your piece.
                                </p>
                            )}
                        </div>

                        <ImageUploader
                            onImagesReady={handleImagesReady}
                            minImages={minImages}
                            maxImages={maxImages}
                        />

                        <div className="flex gap-4">
                            <Button variant="ghost" className="flex-1 rounded-full" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 rounded-full shadow-md"
                                onClick={analyzeImages}
                                disabled={images.length < minImages}
                            >
                                {embedded ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Use This Image
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Analyze Details
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === "analyzing" && (
                    <motion.div key="analyzing" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="py-16 text-center space-y-6">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse" />
                            <Loader2 className="w-20 h-20 animate-spin text-primary absolute inset-0" />
                            <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Appraising...</p>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={loadingText}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-sm text-muted-foreground font-medium"
                                >
                                    {loadingText}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {step === "matches" && potentialMatches.length > 0 && (
                    <motion.div key="matches" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="flex items-center gap-2 text-primary">
                            <Link2 className="w-5 h-5" />
                            <span className="font-semibold tracking-tight">
                                {potentialMatches.length} Similar Item{potentialMatches.length > 1 ? 's' : ''} Found
                            </span>
                        </div>

                        <div className="p-5 bg-card border border-border/50 shadow-sm rounded-xl space-y-2">
                            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">AI Appraisal:</p>
                            <p className="text-xl font-bold">{analysis?.subject}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{analysis?.description}</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground px-1">Is this one of these existing items?</p>

                            <div className="space-y-2">
                                {potentialMatches.map((match) => (
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        key={match.id}
                                        onClick={() => handleSelectMatch(match)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 hover:shadow-md transition-all text-left"
                                    >
                                        {match.reference_image_url ? (
                                            <img
                                                src={match.reference_image_url}
                                                alt={match.subject}
                                                className="w-14 h-14 object-cover rounded-lg shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                                                <UploadIcon className="w-6 h-6 text-muted-foreground/50" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{match.subject}</p>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {match.category && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{match.category}</span>}
                                                {match.year && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{match.year}</span>}
                                                {match.tag_brand && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{match.tag_brand}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary">
                                                {match.similarity}% Match
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full rounded-full h-12"
                            onClick={handleCreateNew}
                        >
                            None of these - Add New Item
                        </Button>
                    </motion.div>
                )}

                {step === "confirm" && analysis && (
                    <motion.div key="confirm" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="flex items-center gap-2 text-primary">
                            <Check className="w-5 h-5" />
                            <span className="font-semibold tracking-tight">
                                {selectedMatch ? "Using existing item" : `${analysis.confidence}% Confident Match`}
                            </span>
                        </div>

                        <div className="p-5 bg-card border border-border/50 shadow-sm rounded-xl space-y-3">
                            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                                {selectedMatch ? "Selected from vault:" : "AI Details:"}
                            </p>
                            <p className="text-xl font-bold">{subject}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.description}</p>
                            {tagGuideMatch && (
                                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                    <div className="flex items-start gap-4">
                                        {tagGuideMatch.reference_image_url ? (
                                            <img
                                                src={tagGuideMatch.reference_image_url}
                                                alt={`${tagGuideMatch.brand_name} tag`}
                                                className="w-12 h-12 object-cover rounded shadow-sm border border-border"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-background flex items-center justify-center border border-border">
                                                <span className="text-xl">🏷️</span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold flex items-center gap-1.5">
                                                {tagGuideMatch.brand_name}
                                                {tagGuideMatch.variation_name && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase tracking-wider">{tagGuideMatch.variation_name}</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                                Era Reference: {tagGuideMatch.era_start} - {tagGuideMatch.era_end || 'present'}
                                            </p>
                                            {analysis.year_range_start && analysis.year_range_end && (
                                                <p className="text-xs text-primary mt-1.5 font-semibold flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Dated to: {analysis.year_range_start}-{analysis.year_range_end}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {selectedMatch ? "Confirm metadata:" : "Verify & Edit details:"}
                            </p>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground ml-1">Subject</label>
                                <input
                                    className="flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    disabled={!!selectedMatch}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Category</label>
                                    <select
                                        className="flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        disabled={!!selectedMatch}
                                    >
                                        {["Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"].map(
                                            (c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">Year</label>
                                    <input
                                        type="number"
                                        className="flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        placeholder="e.g. 1991"
                                        disabled={!!selectedMatch}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground ml-1">Tag Brand</label>
                                <input
                                    className="flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    value={tagBrand}
                                    onChange={(e) => setTagBrand(e.target.value)}
                                    placeholder="Giant, Hanes, etc."
                                    disabled={!!selectedMatch}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <Button variant="ghost" className="flex-1 rounded-full h-12" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button className="flex-1 rounded-full h-12 shadow-md" onClick={saveToVault}>
                                <Check className="w-5 h-5 mr-2" />
                                Confirm &amp; Proceed
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === "saving" && (
                    <motion.div key="saving" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="py-16 text-center space-y-4">
                        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                        <p className="font-semibold text-lg tracking-tight">Archiving to Vault...</p>
                    </motion.div>
                )}

                {step === "error" && (
                    <motion.div key="error" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="py-12 text-center space-y-5">
                        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-destructive" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Appraisal Failed</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{error}</p>
                        </div>
                        <Button variant="outline" onClick={() => setStep("upload")} className="rounded-full">
                            Try Again
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
