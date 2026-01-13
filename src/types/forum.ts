import { Profile } from "./database";

export interface ForumCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    thread_count?: number;
    post_count?: number;
}

export interface ForumThread {
    id: string;
    category_id: string;
    author_id: string;
    title: string;
    slug: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    view_count: number;
    linked_vault_id: string | null;
    last_post_at: string;
    created_at: string;
    updated_at: string;
    // Joined data
    author?: Profile;
    category?: ForumCategory;
    reply_count?: number;
}

export interface ForumPost {
    id: string;
    thread_id: string;
    author_id: string;
    parent_post_id: string | null;
    content: string;
    upvotes: number;
    downvotes: number;
    score: number;
    is_edited: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    author?: Profile;
    replies?: ForumPost[];
}

export type ForumActionStatus = "idle" | "loading" | "success" | "error";
