"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArticleBlockEditor, BlockToolbar } from "./ArticleBlock";
import { VaultEmbedPicker } from "./VaultEmbedPicker";
import { ImageUploader } from "@/components/upload/ImageUploader";
import {
    Save,
    Eye,
    Send,
    ArrowLeft,
    Image as ImageIcon,
    Loader2,
    CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    Article,
    ArticleBlock,
    BlockType,
    ArticleType,
    VaultEmbedBlockContent
} from "@/types/article";
import { ARTICLE_TYPES, getDefaultBlockContent } from "@/types/article";

interface ArticleEditorProps {
    article?: Article;
    blocks?: ArticleBlock[];
}

export function ArticleEditor({ article, blocks: initialBlocks }: ArticleEditorProps) {
    const router = useRouter();
    const { user, profile } = useAuth();

    // Article metadata
    const [title, setTitle] = useState(article?.title || "");
    const [subtitle, setSubtitle] = useState(article?.subtitle || "");
    const [excerpt, setExcerpt] = useState(article?.excerpt || "");
    const [heroImage, setHeroImage] = useState(article?.hero_image_url || "");
    const [articleType, setArticleType] = useState<ArticleType>(article?.article_type || "find_of_the_week");

    // Content blocks
    const [blocks, setBlocks] = useState<ArticleBlock[]>(initialBlocks || []);

    // UI state
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showVaultPicker, setShowVaultPicker] = useState(false);
    const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    // Auto-save draft every 30 seconds
    useEffect(() => {
        if (!article?.id) return;
        const interval = setInterval(() => {
            handleSave(false);
        }, 30000);
        return () => clearInterval(interval);
    }, [article?.id, title, subtitle, blocks]);

    // Add a new block
    const addBlock = useCallback((type: BlockType) => {
        const newBlock: ArticleBlock = {
            id: `temp-${Date.now()}`,
            article_id: article?.id || "",
            block_type: type,
            content: getDefaultBlockContent(type),
            sort_order: blocks.length,
            created_at: new Date().toISOString()
        };
        setBlocks([...blocks, newBlock]);
    }, [blocks, article?.id]);

    // Update a block
    const updateBlock = useCallback((index: number, content: ArticleBlock['content']) => {
        setBlocks(blocks.map((b, i) => i === index ? { ...b, content } : b));
    }, [blocks]);

    // Delete a block
    const deleteBlock = useCallback((index: number) => {
        setBlocks(blocks.filter((_, i) => i !== index));
    }, [blocks]);

    // Move block up/down
    const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;

        const newBlocks = [...blocks];
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        setBlocks(newBlocks.map((b, i) => ({ ...b, sort_order: i })));
    }, [blocks]);

    // Handle vault item selection
    const handleVaultSelect = useCallback((item: { id: string; subject: string; category: string; slug: string | null; reference_image_url: string | null }) => {
        if (activeBlockIndex === null) return;

        const content: VaultEmbedBlockContent = {
            vault_item_id: item.id,
            subject: item.subject,
            category: item.category,
            slug: item.slug || undefined,
            reference_image_url: item.reference_image_url
        };

        updateBlock(activeBlockIndex, content);
        setShowVaultPicker(false);
        setActiveBlockIndex(null);
    }, [activeBlockIndex, updateBlock]);

    // Upload hero image
    const uploadHeroImage = async (file: File): Promise<string> => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from("article-images")
            .upload(`hero/${fileName}`, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from("article-images")
            .getPublicUrl(data.path);

        return publicUrl;
    };

    // Upload inline image
    const uploadInlineImage = async (file: File): Promise<string> => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from("article-images")
            .upload(`inline/${fileName}`, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from("article-images")
            .getPublicUrl(data.path);

        return publicUrl;
    };

    // Save article
    const handleSave = async (showFeedback = true) => {
        if (!user || !title.trim()) return;

        setSaving(true);

        try {
            let articleId = article?.id;

            // Create or update article
            if (articleId) {
                await supabase
                    .from("articles")
                    .update({
                        title,
                        subtitle: subtitle || null,
                        excerpt: excerpt || null,
                        hero_image_url: heroImage || null,
                        article_type: articleType,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", articleId);
            } else {
                // Generate slug
                const { data: slugData } = await supabase.rpc("generate_article_slug", {
                    p_title: title
                });

                const { data, error } = await supabase
                    .from("articles")
                    .insert({
                        title,
                        slug: slugData || title.toLowerCase().replace(/\s+/g, '-'),
                        subtitle: subtitle || null,
                        excerpt: excerpt || null,
                        hero_image_url: heroImage || null,
                        article_type: articleType,
                        author_id: user.id,
                        status: 'draft'
                    })
                    .select()
                    .single();

                if (error) throw error;
                articleId = data.id;
            }

            // Save blocks
            // Delete existing blocks
            await supabase
                .from("article_blocks")
                .delete()
                .eq("article_id", articleId);

            // Insert new blocks
            if (blocks.length > 0) {
                const blocksToInsert = blocks.map((b, i) => ({
                    article_id: articleId,
                    block_type: b.block_type,
                    content: b.content,
                    sort_order: i
                }));

                await supabase.from("article_blocks").insert(blocksToInsert);
            }

            setLastSaved(new Date());

            // Redirect to edit page if new article
            if (!article?.id && articleId) {
                router.replace(`/articles/${articleId}/edit`);
            }
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    // Publish article
    const handlePublish = async () => {
        if (!article?.id || !title.trim()) return;

        setPublishing(true);

        try {
            await supabase
                .from("articles")
                .update({
                    status: 'published',
                    published_at: new Date().toISOString()
                })
                .eq("id", article.id);

            // Get slug for redirect
            const { data } = await supabase
                .from("articles")
                .select("slug")
                .eq("id", article.id)
                .single();

            if (data?.slug) {
                router.push(`/articles/${data.slug}`);
            }
        } catch (error) {
            console.error("Publish error:", error);
        } finally {
            setPublishing(false);
        }
    };

    // Check if user is admin
    if (!profile?.is_admin) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">You don't have permission to create articles.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
                <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    <div className="flex items-center gap-2">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                Saved {lastSaved.toLocaleTimeString()}
                            </span>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewMode(!previewMode)}
                            className="gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            {previewMode ? 'Edit' : 'Preview'}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="gap-2"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Draft
                        </Button>

                        <Button
                            size="sm"
                            onClick={handlePublish}
                            disabled={publishing || !article?.id}
                            className="gap-2"
                        >
                            {publishing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Publish
                        </Button>
                    </div>
                </div>
            </header>

            {/* Editor */}
            <main className="container max-w-4xl mx-auto px-4 py-8">
                {/* Article Type */}
                <div className="mb-6">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Article Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(ARTICLE_TYPES).map(([key, { label, icon }]) => (
                            <Button
                                key={key}
                                variant={articleType === key ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setArticleType(key as ArticleType)}
                                className="gap-2"
                            >
                                <span>{icon}</span>
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Hero Image */}
                <div className="mb-8">
                    {heroImage ? (
                        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden group">
                            <img
                                src={heroImage}
                                alt="Hero"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Button
                                    variant="secondary"
                                    onClick={() => setHeroImage("")}
                                >
                                    Remove Image
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center aspect-[21/9] border-2 border-dashed rounded-2xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20">
                            <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-3" />
                            <span className="text-muted-foreground font-medium">Add hero image</span>
                            <span className="text-xs text-muted-foreground mt-1">Recommended: 2100 x 900px</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const url = await uploadHeroImage(file);
                                        setHeroImage(url);
                                    }
                                }}
                            />
                        </label>
                    )}
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-4 mb-8">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Article title..."
                        className="text-4xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/30"
                    />
                    <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Subtitle (optional)..."
                        className="text-xl text-muted-foreground border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/30"
                    />
                    <Textarea
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder="Brief excerpt for previews (1-2 sentences)..."
                        className="text-base border-0 bg-transparent p-0 focus-visible:ring-0 resize-none min-h-[60px] placeholder:text-muted-foreground/30"
                    />
                </div>

                {/* Content Blocks */}
                <div className="space-y-1 mb-8">
                    {blocks.map((block, index) => (
                        <ArticleBlockEditor
                            key={block.id}
                            block={block}
                            onUpdate={(content) => updateBlock(index, content)}
                            onDelete={() => deleteBlock(index)}
                            onMoveUp={() => moveBlock(index, 'up')}
                            onMoveDown={() => moveBlock(index, 'down')}
                            canMoveUp={index > 0}
                            canMoveDown={index < blocks.length - 1}
                            onOpenVaultPicker={() => {
                                setActiveBlockIndex(index);
                                setShowVaultPicker(true);
                            }}
                            onImageUpload={uploadInlineImage}
                        />
                    ))}
                </div>

                {/* Add Block Toolbar */}
                <BlockToolbar onAddBlock={addBlock} />
            </main>

            {/* Vault Picker Modal */}
            {showVaultPicker && (
                <VaultEmbedPicker
                    onSelect={handleVaultSelect}
                    onClose={() => {
                        setShowVaultPicker(false);
                        setActiveBlockIndex(null);
                    }}
                />
            )}
        </div>
    );
}
