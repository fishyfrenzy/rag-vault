"use client";

import React, { useEffect, useState } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/karma/VoteButtons";
import { KarmaBadge } from "@/components/karma/KarmaBadge";
import { getTierFromKarma, hasPermission } from "@/lib/karma";
import { Check, X, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface EditProposal {
    id: string;
    vault_item_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string;
    status: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
    user: {
        display_name: string;
        karma_score: number;
    } | null;
    vault_item: {
        subject: string;
    } | null;
}

export default function ReviewPage() {
    const { user, profile } = useAuth();
    const [proposals, setProposals] = useState<EditProposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

    const userTier = profile?.karma_score ? getTierFromKarma(profile.karma_score) : "newcomer";
    const canReview = hasPermission(userTier, "vote_on_edits");
    const canApprove = hasPermission(userTier, "approve_edits");

    const fetchProposalsRef = React.useRef<() => Promise<void>>(undefined);

    useEffect(() => {
        const fetchProposals = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("edit_proposals")
                .select(`
            id, vault_item_id, field_name, old_value, new_value, status, upvotes, downvotes, created_at,
            user:profiles(display_name, karma_score),
            vault_item:the_vault(subject)
          `)
                .eq("status", filter)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching proposals:", error);
            } else {
                setProposals((data as unknown as EditProposal[]) || []);
            }
            setLoading(false);
        };

        fetchProposalsRef.current = fetchProposals;
        fetchProposals();
    }, [filter]);

    const refreshProposals = () => {
        fetchProposalsRef.current?.();
    };

    const handleApprove = async (proposal: EditProposal) => {
        if (!user || !canApprove) return;

        // Apply the edit
        await supabase
            .from("the_vault")
            .update({ [proposal.field_name]: proposal.new_value })
            .eq("id", proposal.vault_item_id);

        // Update proposal status
        await supabase
            .from("edit_proposals")
            .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
            .eq("id", proposal.id);

        // Award karma to proposer (if not self)
        if (proposal.user) {
            await supabase.rpc("award_karma", {
                p_user_id: proposal.id, // This should be the proposer's user_id
                p_action: "edit_accepted",
                p_points: 3,
                p_reference_type: "edit_proposal",
                p_reference_id: proposal.id,
                p_description: `Edit to ${proposal.field_name} was approved`,
            });
        }

        refreshProposals();
    };

    const handleReject = async (proposal: EditProposal) => {
        if (!user || !canApprove) return;

        await supabase
            .from("edit_proposals")
            .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
            .eq("id", proposal.id);

        refreshProposals();
    };

    if (!user || !canReview) {
        return (
            <MobileContainer className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4">
                <div className="text-6xl">🔒</div>
                <h1 className="text-2xl font-bold">Review Queue</h1>
                <p className="text-muted-foreground">
                    You need to be a <strong>Trusted</strong> member (200+ karma) to review edits.
                </p>
                {profile && (
                    <KarmaBadge tier={userTier} karma={profile.karma_score || 0} showProgress />
                )}
            </MobileContainer>
        );
    }

    return (
        <MobileContainer className="pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Review Queue</h1>
                    <KarmaBadge tier={userTier} karma={profile?.karma_score || 0} size="sm" />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {(["pending", "approved", "rejected"] as const).map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setFilter(status)}
                            className="capitalize"
                        >
                            {status}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Proposals List */}
            <div className="p-4 space-y-4">
                {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}

                {!loading && proposals.length === 0 && (
                    <div className="text-center py-12 space-y-2">
                        <p className="text-muted-foreground">No {filter} proposals</p>
                        {filter === "pending" && (
                            <p className="text-sm text-muted-foreground">Check back later for new edits to review.</p>
                        )}
                    </div>
                )}

                {proposals.map((proposal) => (
                    <div
                        key={proposal.id}
                        className="border border-border rounded-xl p-4 space-y-4"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <Link
                                    href={`/vault/${proposal.vault_item_id}`}
                                    className="font-bold hover:underline"
                                >
                                    {proposal.vault_item?.subject || "Unknown Item"}
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                    {proposal.user?.display_name || "Unknown"} •{" "}
                                    {new Date(proposal.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <Badge
                                variant={
                                    proposal.status === "approved"
                                        ? "default"
                                        : proposal.status === "rejected"
                                            ? "destructive"
                                            : "secondary"
                                }
                            >
                                {proposal.status}
                            </Badge>
                        </div>

                        {/* Change Preview */}
                        <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                            <p className="text-sm font-medium capitalize">{proposal.field_name.replace("_", " ")}</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground line-through">
                                    {proposal.old_value || "(empty)"}
                                </span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <span className="text-green-500 font-medium">{proposal.new_value}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        {filter === "pending" && (
                            <div className="flex items-center justify-between">
                                <VoteButtons
                                    targetType="edit_proposal"
                                    targetId={proposal.id}
                                    initialUpvotes={proposal.upvotes}
                                    initialDownvotes={proposal.downvotes}
                                />

                                {canApprove && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleReject(proposal)}
                                            className="text-destructive"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Reject
                                        </Button>
                                        <Button size="sm" onClick={() => handleApprove(proposal)}>
                                            <Check className="w-4 h-4 mr-1" />
                                            Approve
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </MobileContainer>
    );
}
