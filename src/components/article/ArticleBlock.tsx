"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    GripVertical,
    X,
    AlignLeft,
    Heading,
    Image as ImageIcon,
    Link,
    Quote,
    Minus,
    ChevronUp,
    ChevronDown
} from "lucide-react";
import type {
    ArticleBlock,
    BlockType,
    TextBlockContent,
    HeadingBlockContent,
    ImageBlockContent,
    VaultEmbedBlockContent,
    QuoteBlockContent,
    DividerBlockContent
} from "@/types/article";

interface BlockProps {
    block: ArticleBlock;
    onUpdate: (content: ArticleBlock['content']) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onOpenVaultPicker?: () => void;
    onImageUpload?: (file: File) => Promise<string>;
}

export function ArticleBlockEditor({
    block,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    onOpenVaultPicker,
    onImageUpload
}: BlockProps) {
    const renderBlock = () => {
        switch (block.block_type) {
            case 'text':
                return (
                    <TextBlockEditor
                        content={block.content as TextBlockContent}
                        onUpdate={onUpdate}
                    />
                );
            case 'heading':
                return (
                    <HeadingBlockEditor
                        content={block.content as HeadingBlockContent}
                        onUpdate={onUpdate}
                    />
                );
            case 'image':
                return (
                    <ImageBlockEditor
                        content={block.content as ImageBlockContent}
                        onUpdate={onUpdate}
                        onUpload={onImageUpload}
                    />
                );
            case 'vault_embed':
                return (
                    <VaultEmbedBlockEditor
                        content={block.content as VaultEmbedBlockContent}
                        onUpdate={onUpdate}
                        onOpenPicker={onOpenVaultPicker}
                    />
                );
            case 'quote':
                return (
                    <QuoteBlockEditor
                        content={block.content as QuoteBlockContent}
                        onUpdate={onUpdate}
                    />
                );
            case 'divider':
                return (
                    <DividerBlockEditor
                        content={block.content as DividerBlockContent}
                        onUpdate={onUpdate}
                    />
                );
            default:
                return <div>Unknown block type</div>;
        }
    };

    return (
        <div className="group relative flex gap-2 py-2">
            {/* Drag handle & controls */}
            <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                <button className="p-1 text-muted-foreground hover:text-foreground cursor-grab">
                    <GripVertical className="w-4 h-4" />
                </button>
                <button
                    onClick={onMoveUp}
                    disabled={!canMoveUp}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                    <ChevronUp className="w-3 h-3" />
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={!canMoveDown}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                    <ChevronDown className="w-3 h-3" />
                </button>
            </div>

            {/* Block content */}
            <div className="flex-1 min-w-0">
                {renderBlock()}
            </div>

            {/* Delete button */}
            <button
                onClick={onDelete}
                className="absolute right-0 top-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Text Block
function TextBlockEditor({
    content,
    onUpdate
}: {
    content: TextBlockContent;
    onUpdate: (content: TextBlockContent) => void;
}) {
    return (
        <div className="space-y-2">
            <Textarea
                value={content.text}
                onChange={(e) => onUpdate({ ...content, text: e.target.value })}
                placeholder="Write your text here..."
                className="min-h-[100px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-base leading-relaxed"
            />
            <div className="flex gap-2">
                <Button
                    variant={content.format === 'lead' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onUpdate({ ...content, format: content.format === 'lead' ? 'paragraph' : 'lead' })}
                    className="text-xs h-7"
                >
                    Lead paragraph
                </Button>
            </div>
        </div>
    );
}

// Heading Block
function HeadingBlockEditor({
    content,
    onUpdate
}: {
    content: HeadingBlockContent;
    onUpdate: (content: HeadingBlockContent) => void;
}) {
    return (
        <div className="space-y-2">
            <Input
                value={content.text}
                onChange={(e) => onUpdate({ ...content, text: e.target.value })}
                placeholder="Heading text..."
                className={cn(
                    "border-0 bg-transparent p-0 focus-visible:ring-0 font-bold",
                    content.level === 2 ? "text-2xl" : "text-xl"
                )}
            />
            <div className="flex gap-2">
                <Button
                    variant={content.level === 2 ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onUpdate({ ...content, level: 2 })}
                    className="text-xs h-7"
                >
                    H2
                </Button>
                <Button
                    variant={content.level === 3 ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onUpdate({ ...content, level: 3 })}
                    className="text-xs h-7"
                >
                    H3
                </Button>
            </div>
        </div>
    );
}

// Image Block
function ImageBlockEditor({
    content,
    onUpdate,
    onUpload
}: {
    content: ImageBlockContent;
    onUpdate: (content: ImageBlockContent) => void;
    onUpload?: (file: File) => Promise<string>;
}) {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            try {
                const url = await onUpload(file);
                onUpdate({ ...content, url, alt: file.name });
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }
    };

    return (
        <div className="space-y-3">
            {content.url ? (
                <div className="relative">
                    <img
                        src={content.url}
                        alt={content.alt}
                        className={cn(
                            "rounded-xl object-cover",
                            content.width === 'full' && "w-full",
                            content.width === 'wide' && "w-full max-w-3xl",
                            content.width === 'medium' && "w-full max-w-xl"
                        )}
                    />
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>
            )}

            <div className="flex gap-2 items-center">
                <Input
                    value={content.caption || ''}
                    onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
                    placeholder="Caption (optional)"
                    className="text-sm"
                />
                <select
                    value={content.width || 'wide'}
                    onChange={(e) => onUpdate({ ...content, width: e.target.value as ImageBlockContent['width'] })}
                    className="text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                    <option value="medium">Medium</option>
                    <option value="wide">Wide</option>
                    <option value="full">Full Width</option>
                </select>
            </div>
        </div>
    );
}

// Vault Embed Block
function VaultEmbedBlockEditor({
    content,
    onUpdate,
    onOpenPicker
}: {
    content: VaultEmbedBlockContent;
    onUpdate: (content: VaultEmbedBlockContent) => void;
    onOpenPicker?: () => void;
}) {
    if (content.vault_item_id && content.subject) {
        return (
            <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                {content.reference_image_url && (
                    <img
                        src={content.reference_image_url}
                        alt={content.subject}
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{content.subject}</p>
                    <p className="text-sm text-muted-foreground">{content.category}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onOpenPicker}>
                    Change
                </Button>
            </div>
        );
    }

    return (
        <button
            onClick={onOpenPicker}
            className="w-full flex items-center justify-center gap-2 h-20 border-2 border-dashed rounded-xl hover:border-primary/50 transition-colors text-muted-foreground"
        >
            <Link className="w-5 h-5" />
            <span>Select a vault item to embed</span>
        </button>
    );
}

// Quote Block
function QuoteBlockEditor({
    content,
    onUpdate
}: {
    content: QuoteBlockContent;
    onUpdate: (content: QuoteBlockContent) => void;
}) {
    return (
        <div className="pl-4 border-l-4 border-primary/30 space-y-2">
            <Textarea
                value={content.text}
                onChange={(e) => onUpdate({ ...content, text: e.target.value })}
                placeholder="Quote text..."
                className="min-h-[60px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-lg italic"
            />
            <Input
                value={content.attribution || ''}
                onChange={(e) => onUpdate({ ...content, attribution: e.target.value })}
                placeholder="Attribution (optional)"
                className="border-0 bg-transparent p-0 focus-visible:ring-0 text-sm text-muted-foreground"
            />
        </div>
    );
}

// Divider Block
function DividerBlockEditor({
    content,
    onUpdate
}: {
    content: DividerBlockContent;
    onUpdate: (content: DividerBlockContent) => void;
}) {
    return (
        <div className="py-4">
            <div className={cn(
                "mx-auto",
                content.style === 'line' && "h-px bg-border w-full",
                content.style === 'dots' && "flex gap-2 justify-center",
                content.style === 'space' && "h-8"
            )}>
                {content.style === 'dots' && (
                    <>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    </>
                )}
            </div>
            <div className="flex gap-2 justify-center mt-2">
                {(['line', 'dots', 'space'] as const).map((style) => (
                    <Button
                        key={style}
                        variant={content.style === style ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => onUpdate({ style })}
                        className="text-xs h-7 capitalize"
                    >
                        {style}
                    </Button>
                ))}
            </div>
        </div>
    );
}

// Block Toolbar (add new blocks)
interface BlockToolbarProps {
    onAddBlock: (type: BlockType) => void;
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
    const blocks: { type: BlockType; icon: React.ReactNode; label: string }[] = [
        { type: 'text', icon: <AlignLeft className="w-4 h-4" />, label: 'Text' },
        { type: 'heading', icon: <Heading className="w-4 h-4" />, label: 'Heading' },
        { type: 'image', icon: <ImageIcon className="w-4 h-4" />, label: 'Image' },
        { type: 'vault_embed', icon: <Link className="w-4 h-4" />, label: 'Vault Item' },
        { type: 'quote', icon: <Quote className="w-4 h-4" />, label: 'Quote' },
        { type: 'divider', icon: <Minus className="w-4 h-4" />, label: 'Divider' },
    ];

    return (
        <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-xl border border-border/50">
            <span className="text-xs text-muted-foreground self-center mr-2">Add block:</span>
            {blocks.map((block) => (
                <Button
                    key={block.type}
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddBlock(block.type)}
                    className="gap-2 h-8"
                >
                    {block.icon}
                    <span className="text-xs">{block.label}</span>
                </Button>
            ))}
        </div>
    );
}
