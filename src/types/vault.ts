/**
 * Shared Vault Types
 * Centralized type definitions for vault items
 */

export interface VaultItem {
    id: string;
    subject: string;
    brand: string | null;
    title: string | null;
    slug: string | null;
    category: string;
    year: string | null;
    tag_brand: string | null;
    stitch_type: string | null;
    material: string | null;
    origin: string | null;
    body_type: string | null;
    reference_image_url: string | null;
    verification_count: number;
    upvotes: number;
    downvotes: number;
    score: number;
    created_at: string;
    created_by: string | null;
    description: string | null;
    tags: string[] | null;
    parent_id: string | null;
    variant_type: string | null;
    is_verified?: boolean;
}

export interface VaultItemSummary {
    id: string;
    subject: string;
    brand: string | null;
    title: string | null;
    slug: string | null;
    category: string;
    year: string | null;
    tag_brand: string | null;
    reference_image_url: string | null;
    verification_count: number;
    created_at: string;
}

export interface VaultSearchParams {
    query?: string;
    category?: string;
    sortBy?: 'newest' | 'verified' | 'alphabetical' | 'score';
    filters?: {
        verifiedOnly?: boolean;
        hasImage?: boolean;
        newThisWeek?: boolean;
    };
    limit?: number;
    offset?: number;
}

export interface VaultSearchResult {
    items: VaultItem[];
    total: number;
    hasMore: boolean;
}

export const VAULT_CATEGORIES = [
    "All",
    "Music",
    "Motorcycle",
    "Movie",
    "Art",
    "Sport",
    "Advertising",
    "Other"
] as const;

export type VaultCategory = typeof VAULT_CATEGORIES[number];

export const SORT_OPTIONS = [
    { value: 'verified', label: 'Most Verified' },
    { value: 'newest', label: 'Newest First' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'score', label: 'Top Rated' },
] as const;

export type SortOption = typeof SORT_OPTIONS[number]['value'];
