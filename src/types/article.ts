/**
 * Shared Article Types
 * Type definitions for articles and content blocks
 */

// Article types
export const ARTICLE_TYPES = {
    find_of_the_week: { label: 'Find of the Week', icon: '🔥' },
    tag_guide: { label: 'Tag Guide', icon: '🏷️' },
    collection_spotlight: { label: 'Collection Spotlight', icon: '✨' },
    authentication_tips: { label: 'Authentication Tips', icon: '🔍' },
    market_trends: { label: 'Market Trends', icon: '📈' },
    general: { label: 'General', icon: '📝' },
} as const;

export type ArticleType = keyof typeof ARTICLE_TYPES;
export type ArticleStatus = 'draft' | 'published' | 'archived';

// Block types
export type BlockType = 'text' | 'image' | 'vault_embed' | 'quote' | 'divider' | 'heading';

// Content block structures
export interface TextBlockContent {
    text: string;
    format?: 'paragraph' | 'lead'; // lead = larger intro text
}

export interface HeadingBlockContent {
    text: string;
    level: 2 | 3; // h2 or h3
}

export interface ImageBlockContent {
    url: string;
    alt: string;
    caption?: string;
    width?: 'full' | 'wide' | 'medium' | 'custom'; // full = edge-to-edge, wide = larger, medium = content width, custom = percentage
    customWidth?: number; // 10-100 percentage when width is 'custom'
}

export interface VaultEmbedBlockContent {
    vault_item_id: string;
    // Cached data for display (so we don't need to fetch)
    subject?: string;
    category?: string;
    slug?: string;
    reference_image_url?: string | null;
}

export interface QuoteBlockContent {
    text: string;
    attribution?: string;
}

export interface DividerBlockContent {
    style?: 'line' | 'dots' | 'space';
}

// Union type for all block content
export type BlockContent =
    | TextBlockContent
    | HeadingBlockContent
    | ImageBlockContent
    | VaultEmbedBlockContent
    | QuoteBlockContent
    | DividerBlockContent;

// Article block
export interface ArticleBlock {
    id: string;
    article_id: string;
    block_type: BlockType;
    content: BlockContent;
    sort_order: number;
    created_at: string;
}

// Full article
export interface Article {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    excerpt: string | null;
    hero_image_url: string | null;
    hero_position?: { x: number; y: number }; // Focal point (0-100 for each axis)
    article_type: ArticleType;
    status: ArticleStatus;
    featured_vault_id: string | null;
    author_id: string | null;
    view_count: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

// Article with blocks
export interface ArticleWithBlocks extends Article {
    blocks: ArticleBlock[];
}

// Article with author info
export interface ArticleWithAuthor extends Article {
    author?: {
        id: string;
        display_name: string;
        username: string | null;
        avatar_url: string | null;
    };
}

// Article summary for cards/lists
export interface ArticleSummary {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    excerpt: string | null;
    hero_image_url: string | null;
    article_type: ArticleType;
    published_at: string | null;
    author?: {
        display_name: string;
        avatar_url: string | null;
    };
}

// Block toolbar actions
export interface BlockToolbarAction {
    type: BlockType;
    label: string;
    icon: string;
}

export const BLOCK_TOOLBAR_ACTIONS: BlockToolbarAction[] = [
    { type: 'text', label: 'Text', icon: 'AlignLeft' },
    { type: 'heading', label: 'Heading', icon: 'Heading' },
    { type: 'image', label: 'Image', icon: 'Image' },
    { type: 'vault_embed', label: 'Vault Item', icon: 'Link' },
    { type: 'quote', label: 'Quote', icon: 'Quote' },
    { type: 'divider', label: 'Divider', icon: 'Minus' },
];

// Default content for new blocks
export function getDefaultBlockContent(type: BlockType): BlockContent {
    switch (type) {
        case 'text':
            return { text: '' };
        case 'heading':
            return { text: '', level: 2 };
        case 'image':
            return { url: '', alt: '', width: 'wide' };
        case 'vault_embed':
            return { vault_item_id: '' };
        case 'quote':
            return { text: '' };
        case 'divider':
            return { style: 'line' };
        default:
            return { text: '' };
    }
}
