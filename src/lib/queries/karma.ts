/**
 * Centralized Karma Queries
 * All database queries related to karma, votes, and edit proposals
 */

import { supabase } from "@/lib/supabase/client";

// Types
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
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    user?: { display_name: string; karma_score: number };
    vault_item?: { subject: string };
}

export interface Vote {
    id: string;
    user_id: string;
    target_type: "vault_item" | "edit_proposal" | "contribution";
    target_id: string;
    vote_type: "up" | "down";
    created_at: string;
}

// Queries
export async function getEditProposals(status: string = "pending", limit = 50) {
    const { data, error } = await supabase
        .from("edit_proposals")
        .select(`
            id, vault_item_id, field_name, old_value, new_value, status, 
            upvotes, downvotes, created_at, user_id,
            user:profiles!user_id(display_name, karma_score),
            vault_item:the_vault(subject)
        `)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

    return { data: data as EditProposal[] | null, error };
}

export async function getUserVote(userId: string, targetType: string, targetId: string) {
    const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .single();

    return { data: data as Vote | null, error };
}

export async function getVotesForTarget(targetType: string, targetId: string) {
    const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId);

    return { data: data as Vote[] | null, error };
}

// Mutations
export async function castVote(
    userId: string,
    targetType: string,
    targetId: string,
    voteType: "up" | "down"
) {
    // Upsert vote
    const { data, error } = await supabase
        .from("votes")
        .upsert({
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
            vote_type: voteType,
        }, { onConflict: "user_id,target_type,target_id" })
        .select()
        .single();

    return { data, error };
}

export async function removeVote(userId: string, targetType: string, targetId: string) {
    const { error } = await supabase
        .from("votes")
        .delete()
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

    return { error };
}

export async function createEditProposal(proposal: {
    vault_item_id: string;
    user_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string;
}) {
    const { data, error } = await supabase
        .from("edit_proposals")
        .insert(proposal)
        .select()
        .single();

    return { data: data as EditProposal | null, error };
}

export async function updateProposalStatus(
    proposalId: string,
    status: "approved" | "rejected",
    reviewerId: string
) {
    const { data, error } = await supabase
        .from("edit_proposals")
        .update({
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId)
        .select()
        .single();

    return { data: data as EditProposal | null, error };
}
