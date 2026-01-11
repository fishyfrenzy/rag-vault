/**
 * Database Types
 * TypeScript types matching Supabase schema
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// === PROFILES ===
export interface Profile {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    birth_year: number | null;
    karma_score: number;
    karma_tier: "newcomer" | "contributor" | "trusted" | "expert" | "curator" | "moderator";
    total_contributions: number;
    reputation_multiplier: number;
    is_admin: boolean;
    is_active: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    profile_visibility: {
        bio: boolean;
        location: boolean;
        age: boolean;
    } | null;
    profile_slots: ProfileSlot[] | null;
    selected_title: string | null;
}

export interface ProfileSlot {
    type: "all_shirts" | "collections" | "iso" | "collection" | "shirts";
    id?: string;
    ids?: string[];
    title?: string;
}

// === VAULT ===
export interface VaultItem {
    id: string;
    subject: string;
    category: Category;
    year: string | null;
    tag_brand: string[] | null;
    stitch_type: "Single" | "Double" | "Mixed" | "Other" | null;
    material: string | null;
    origin: string | null;
    body_type: string | null;
    reference_image_url: string | null;
    description: string | null;
    search_keywords: string | null;
    tags: string[] | null;
    verification_count: number;
    upvotes: number;
    downvotes: number;
    score: number;
    is_verified: boolean;
    is_active: boolean;
    deleted_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export type Category =
    | "Music"
    | "Motorcycle"
    | "Movie"
    | "Art"
    | "Sport"
    | "Advertising"
    | "Other";

// === INVENTORY ===
export interface InventoryItem {
    id: string;
    vault_id: string;
    user_id: string;
    condition: number | null;
    size: string | null;
    price: number | null;
    for_sale: boolean;
    images: InventoryImage[] | null;
    body_type: string | null;
    tag: string | null;
    notes: string | null;
    collection_id: string | null;
    listing_type: "collection" | "iso" | "for_sale" | "sold" | null;
    is_active: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface InventoryImage {
    view: string;
    url: string;
}

// === COLLECTIONS ===
export interface Collection {
    id: string;
    user_id: string;
    name: string;
    color: string;
    is_private: boolean;
    created_at: string;
}

// === EDIT PROPOSALS ===
export interface EditProposal {
    id: string;
    vault_item_id: string;
    user_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string;
    status: "pending" | "approved" | "rejected";
    upvotes: number;
    downvotes: number;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

// === VOTES ===
export interface Vote {
    id: string;
    user_id: string;
    target_type: "vault_item" | "edit_proposal" | "contribution";
    target_id: string;
    vote_type: "up" | "down";
    created_at: string;
}

// === CONTRIBUTIONS ===
export interface Contribution {
    id: string;
    user_id: string;
    vault_item_id: string | null;
    action: string;
    points: number;
    created_at: string;
}

// === KARMA TRANSACTIONS ===
export interface KarmaTransaction {
    id: string;
    user_id: string;
    action: string;
    points: number;
    reference_type: string | null;
    reference_id: string | null;
    description: string | null;
    created_at: string;
}

// === ACTIVITY FEED ===
export interface ActivityFeedItem {
    id: string;
    actor_id: string | null;
    action_type: string;
    target_type: string | null;
    target_id: string | null;
    metadata: Json | null;
    created_at: string;
}

// === FEEDBACK ===
export interface Feedback {
    id: string;
    user_id: string | null;
    message: string;
    page_url: string | null;
    created_at: string;
}

// === INVITE CODES ===
export interface InviteCode {
    id: string;
    code: string;
    created_by: string;
    used_by: string | null;
    used_at: string | null;
    expires_at: string | null;
    created_at: string;
}

// === CATEGORIES (lookup table) ===
export interface CategoryRecord {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    display_order: number;
    is_active: boolean;
    created_at: string;
}

// === ADMIN AUDIT LOG ===
export interface AdminAuditLog {
    id: string;
    admin_id: string | null;
    action: string;
    target_table: string | null;
    target_id: string | null;
    old_values: Json | null;
    new_values: Json | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

// === RATE LIMITS ===
export interface RateLimit {
    user_id: string;
    action: string;
    window_start: string;
    request_count: number;
}
