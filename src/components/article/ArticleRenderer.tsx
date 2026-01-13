"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type {
    ArticleBlock,
    TextBlockContent,
    HeadingBlockContent,
    ImageBlockContent,
    VaultEmbedBlockContent,
    QuoteBlockContent,
    DividerBlockContent
} from "@/types/article";
import { CheckCircle } from "lucide-react";

interface ArticleRendererProps {
    blocks: ArticleBlock[];
    className?: string;
}

export function ArticleRenderer({ blocks, className }: ArticleRendererProps) {
    return (
        <div className={cn("space-y-6", className)}>
            {blocks
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((block) => (
                    <BlockRenderer key={block.id} block={block} />
                ))}
        </div>
    );
}

function BlockRenderer({ block }: { block: ArticleBlock }) {
    switch (block.block_type) {
        case 'text':
            return <TextBlock content={block.content as TextBlockContent} />;
        case 'heading':
            return <HeadingBlock content={block.content as HeadingBlockContent} />;
        case 'image':
            return <ImageBlock content={block.content as ImageBlockContent} />;
        case 'vault_embed':
            return <VaultEmbedBlock content={block.content as VaultEmbedBlockContent} />;
        case 'quote':
            return <QuoteBlock content={block.content as QuoteBlockContent} />;
        case 'divider':
            return <DividerBlock content={block.content as DividerBlockContent} />;
        default:
            return null;
    }
}

// Text Block
function TextBlock({ content }: { content: TextBlockContent }) {
    return (
        <p className={cn(
            "leading-relaxed text-foreground/90",
            content.format === 'lead' ? "text-xl text-muted-foreground" : "text-base"
        )}>
            {content.text}
        </p>
    );
}

// Heading Block
function HeadingBlock({ content }: { content: HeadingBlockContent }) {
    const Tag = content.level === 2 ? 'h2' : 'h3';
    return (
        <Tag className={cn(
            "font-bold text-foreground",
            content.level === 2 ? "text-2xl mt-8 mb-4" : "text-xl mt-6 mb-3"
        )}>
            {content.text}
        </Tag>
    );
}

// Image Block
function ImageBlock({ content }: { content: ImageBlockContent }) {
    if (!content.url) return null;

    const getStyleAndClass = () => {
        if (content.width === 'custom' && content.customWidth) {
            return { style: { width: `${content.customWidth}%` }, className: "mx-auto" };
        }
        if (content.width === 'full') return { className: "-mx-4 md:-mx-8 lg:-mx-16" };
        if (content.width === 'wide') return { className: "max-w-3xl mx-auto" };
        return { className: "max-w-xl mx-auto" }; // medium/default
    };

    const { style, className } = getStyleAndClass();

    return (
        <figure className={cn("my-8", className)} style={style}>
            <img
                src={content.url}
                alt={content.alt}
                className="w-full rounded-xl"
            />
            {content.caption && (
                <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
                    {content.caption}
                </figcaption>
            )}
        </figure>
    );
}

// Vault Embed Block
function VaultEmbedBlock({ content }: { content: VaultEmbedBlockContent }) {
    if (!content.vault_item_id) return null;

    return (
        <Link
            href={`/vault/${content.slug || content.vault_item_id}`}
            className="block my-8 group"
        >
            <div className="flex gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/30 transition-colors">
                {content.reference_image_url && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-secondary shrink-0">
                        <img
                            src={content.reference_image_url}
                            alt={content.subject || ''}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                            Featured Shirt
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <h4 className="font-semibold text-lg mt-1 group-hover:text-primary transition-colors">
                        {content.subject}
                    </h4>
                    <p className="text-sm text-muted-foreground">{content.category}</p>
                </div>
            </div>
        </Link>
    );
}

// Quote Block
function QuoteBlock({ content }: { content: QuoteBlockContent }) {
    return (
        <blockquote className="my-8 pl-6 border-l-4 border-primary/30">
            <p className="text-xl italic text-foreground/80 leading-relaxed">
                "{content.text}"
            </p>
            {content.attribution && (
                <cite className="block mt-3 text-sm text-muted-foreground not-italic">
                    — {content.attribution}
                </cite>
            )}
        </blockquote>
    );
}

// Divider Block
function DividerBlock({ content }: { content: DividerBlockContent }) {
    return (
        <div className="my-12 flex justify-center">
            {content.style === 'line' && (
                <hr className="w-full border-border" />
            )}
            {content.style === 'dots' && (
                <div className="flex gap-3">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
            )}
            {content.style === 'space' && (
                <div className="h-8" />
            )}
        </div>
    );
}
