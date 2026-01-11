/**
 * Centralized Profile Queries
 * All database queries related to user profiles
 */

import { supabase } from "@/lib/supabase/client";

// Types
export interface Profile {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    karma_score: number;
    karma_tier: string;
    total_contributions: number;
    is_admin: boolean;
    is_active: boolean;
    created_at: string;
}

export interface InventoryItem {
    id: string;
    vault_id: string;
    size: string | null;
    condition: number | null;
    price: number | null;
    for_sale: boolean;
    images: { view: string; url: string }[] | null;
    body_type: string | null;
    tag: string | null;
    collection_id: string | null;
    vault: {
        subject: string;
        category: string;
        year: number | null;
        reference_image_url: string | null;
    };
}

// Queries
export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    return { data: data as Profile | null, error };
}

export async function getProfileByUsername(username: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

    return { data: data as Profile | null, error };
}

export async function getUserInventory(userId: string, limit = 50) {
    const { data, error } = await supabase
        .from("user_inventory")
        .select(`
            *,
            vault:the_vault(subject, category, year, reference_image_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return { data: data as InventoryItem[] | null, error };
}

export async function getUserCollections(userId: string) {
    const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    return { data, error };
}

export async function getKarmaHistory(userId: string, limit = 20) {
    const { data, error } = await supabase
        .from("karma_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return { data, error };
}

export async function getLeaderboard(limit = 50) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, karma_score, karma_tier")
        .gt("karma_score", 0)
        .order("karma_score", { ascending: false })
        .limit(limit);

    return { data, error };
}

// Mutations
export async function updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

    return { data: data as Profile | null, error };
}
