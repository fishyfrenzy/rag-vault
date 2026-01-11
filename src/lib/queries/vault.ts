/**
 * Centralized Vault Queries
 * All database queries related to vault items
 */

import { supabase } from "@/lib/supabase/client";

// Types
export interface VaultItem {
    id: string;
    subject: string;
    category: string;
    year: string | null;
    tag_brand: string[] | null;
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
    is_verified?: boolean;
}

export interface VaultSearchParams {
    query?: string;
    category?: string;
    limit?: number;
    offset?: number;
}

// Queries
export async function getVaultItem(id: string) {
    const { data, error } = await supabase
        .from("the_vault")
        .select("*")
        .eq("id", id)
        .single();

    return { data: data as VaultItem | null, error };
}

export async function searchVaultItems({ query, category, limit = 20, offset = 0 }: VaultSearchParams) {
    let q = supabase
        .from("the_vault")
        .select("*", { count: "exact" })
        .order("score", { ascending: false })
        .range(offset, offset + limit - 1);

    if (query) {
        q = q.ilike("subject", `%${query}%`);
    }
    if (category && category !== "All") {
        q = q.eq("category", category);
    }

    const { data, error, count } = await q;
    return { data: data as VaultItem[] | null, error, count };
}

export async function getRecentVaultItems(limit = 8) {
    const { data, error } = await supabase
        .from("the_vault")
        .select("id, subject, year, category, reference_image_url")
        .order("created_at", { ascending: false })
        .limit(limit);

    return { data, error };
}

export async function getVerifiedVaultItems(limit = 20) {
    const { data, error } = await supabase
        .from("the_vault")
        .select("*")
        .gte("verification_count", 2)
        .order("score", { ascending: false })
        .limit(limit);

    return { data: data as VaultItem[] | null, error };
}

export async function getVaultItemContributions(vaultItemId: string, limit = 10) {
    const { data, error } = await supabase
        .from("contributions")
        .select(`
            id, action, points, created_at,
            user:profiles!user_id(display_name)
        `)
        .eq("vault_item_id", vaultItemId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return { data, error };
}

// Mutations
export async function createVaultItem(item: Partial<VaultItem>) {
    const { data, error } = await supabase
        .from("the_vault")
        .insert(item)
        .select()
        .single();

    return { data: data as VaultItem | null, error };
}

export async function verifyVaultItem(vaultItemId: string, userId: string) {
    // Check if already verified
    const { data: existing } = await supabase
        .from("contributions")
        .select("id")
        .eq("vault_item_id", vaultItemId)
        .eq("user_id", userId)
        .eq("action", "verify")
        .single();

    if (existing) {
        return { success: false, error: "Already verified" };
    }

    // Add contribution
    const { error } = await supabase.from("contributions").insert({
        vault_item_id: vaultItemId,
        user_id: userId,
        action: "verify",
        points: 2,
    });

    if (error) return { success: false, error: error.message };

    // Increment count
    await supabase.rpc("increment_verification_count", { item_id: vaultItemId });

    return { success: true, error: null };
}
