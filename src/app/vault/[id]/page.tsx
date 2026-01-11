"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/karma/VoteButtons";
import { EditProposalModal } from "@/components/karma/EditProposalModal";
import { getTierFromKarma, hasPermission } from "@/lib/karma";
import {
    ArrowLeft,
    CheckCircle,
    Calendar,
    Tag,
    Users,
    Clock,
    Edit,
    Sparkles,
    Link2,
    History,
    GitBranch,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { IsoButton } from "@/components/profile/IsoList";
import { ItemHistory } from "@/components/vault/ItemHistory";
import { VariantsSection } from "@/components/vault/VariantCard";
import { RelatedShirts } from "@/components/vault/RelatedShirts";
import { SuggestRelatedModal } from "@/components/vault/SuggestRelatedModal";

const getFlagEmoji = (countryName: string) => {
    if (!countryName) return "🌍";
    const code = countryName.toLowerCase();
    if (code === "usa" || code === "united states" || code === "america") return "🇺🇸";
    if (code === "uk" || code === "united kingdom" || code === "england" || code === "great britain") return "🇬🇧";
    if (code === "canada") return "🇨🇦";
    if (code === "mexico") return "🇲🇽";
    if (code === "japan") return "🇯🇵";
    if (code === "china") return "🇨🇳";
    if (code === "france") return "🇫🇷";
    if (code === "italy") return "🇮🇹";
    if (code === "germany") return "🇩🇪";
    if (code === "haiti") return "🇭🇹";
    if (code === "el salvador") return "🇸🇻";
    if (code === "honduras") return "🇭🇳";
    if (code === "pakistan") return "🇵🇰";
    if (code === "india") return "🇮🇳";
    if (code === "ireland") return "🇮🇪";
    if (code === "australia") return "🇦🇺";
    return "🌍";
};

interface VaultItem {
    id: string;
    subject: string;
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
}

interface VariantItem {
    id: string;
    subject: string;
    variant_type: string | null;
    reference_image_url: string | null;
}

interface ParentShirt {
    id: string;
    subject: string;
    reference_image_url: string | null;
}

interface Contribution {
    id: string;
    action: string;
    points: number;
    created_at: string;
    user: {
        display_name: string;
    } | null;
}

export default function VaultItemPage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    const [item, setItem] = useState<VaultItem | null>(null);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [hasVerified, setHasVerified] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRelatedModal, setShowRelatedModal] = useState(false);
    const [variants, setVariants] = useState<VariantItem[]>([]);
    const [parentShirt, setParentShirt] = useState<ParentShirt | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const fetchItemRef = React.useRef<() => Promise<void>>(undefined);
    const fetchContributionsRef = React.useRef<() => Promise<void>>(undefined);

    useEffect(() => {
        const fetchItem = async () => {
            const { data, error } = await supabase
                .from("the_vault")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) {
                console.error("Error fetching item:", error);
            } else {
                setItem(data);
            }
            setLoading(false);
        };

        const fetchContributions = async () => {
            const { data } = await supabase
                .from("contributions")
                .select(`
                    id, action, points, created_at,
                    user:profiles(display_name)
                `)
                .eq("vault_item_id", params.id)
                .order("created_at", { ascending: false })
                .limit(10);

            setContributions((data as unknown as Contribution[]) || []);
        };

        const checkUserVerification = async () => {
            if (!user) return;

            const { data } = await supabase
                .from("contributions")
                .select("id")
                .eq("vault_item_id", params.id)
                .eq("user_id", user.id)
                .eq("action", "verify")
                .limit(1);

            setHasVerified((data && data.length > 0) ?? false);
        };

        const fetchVariants = async () => {
            // Fetch child variants
            const { data: childVariants } = await supabase
                .from("the_vault")
                .select("id, subject, variant_type, reference_image_url")
                .eq("parent_id", params.id)
                .limit(10);
            setVariants((childVariants as VariantItem[]) || []);
        };

        const fetchParentShirt = async (parentId: string) => {
            const { data } = await supabase
                .from("the_vault")
                .select("id, subject, reference_image_url")
                .eq("id", parentId)
                .single();
            if (data) setParentShirt(data as ParentShirt);
        };

        fetchItemRef.current = fetchItem;
        fetchContributionsRef.current = fetchContributions;

        if (params.id) {
            fetchItem().then(() => {
                // After item loads, fetch parent if this is a variant
            });
            fetchContributions();
            checkUserVerification();
            fetchVariants();
        }
    }, [params.id, user]);

    // Fetch parent if item has parent_id
    useEffect(() => {
        if (item?.parent_id) {
            supabase
                .from("the_vault")
                .select("id, subject, reference_image_url")
                .eq("id", item.parent_id)
                .single()
                .then(({ data }) => {
                    if (data) setParentShirt(data as ParentShirt);
                });
        }
    }, [item?.parent_id]);

    const refreshData = () => {
        fetchItemRef.current?.();
        fetchContributionsRef.current?.();
    };

    const handleVerify = async () => {
        if (!user || !item || hasVerified) return;

        setVerifying(true);

        const { error: contribError } = await supabase
            .from("contributions")
            .insert({
                user_id: user.id,
                vault_item_id: item.id,
                action: "verify",
                points: 2,
            });

        if (contribError) {
            console.error("Error adding verification:", contribError);
            setVerifying(false);
            return;
        }

        await supabase
            .from("the_vault")
            .update({ verification_count: (item.verification_count || 0) + 1 })
            .eq("id", item.id);

        if (item.created_by && item.created_by !== user.id) {
            await supabase
                .from("contributions")
                .insert({
                    user_id: item.created_by,
                    vault_item_id: item.id,
                    action: "verify",
                    points: 3,
                });
        }

        setHasVerified(true);
        setVerifying(false);
        refreshData();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Item not found</p>
            </div>
        );
    }

    const isVerified = item.verification_count >= 3;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                    {isVerified && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs font-medium text-green-500">Verified</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Image Section */}
                    <div className="space-y-3">
                        <div className="relative aspect-[4/5] max-h-[60vh] lg:max-h-[70vh] rounded-2xl overflow-hidden bg-secondary/50 border border-border/50">
                            {item.reference_image_url ? (
                                <img
                                    src={item.reference_image_url}
                                    alt={item.subject}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-8xl text-muted-foreground/20">👕</span>
                                </div>
                            )}

                            {/* Image overlay badges */}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                <Badge
                                    variant="secondary"
                                    className="backdrop-blur-md bg-black/60 text-white border-0 px-3 py-1"
                                >
                                    {item.category}
                                </Badge>
                            </div>
                        </div>

                        {/* Thumbnail placeholder - Hidden as requested until multiple images are supported
                        <div className="hidden lg:flex gap-2">
                            <div className="w-16 h-16 rounded-lg bg-secondary/50 border-2 border-primary/50 overflow-hidden">
                                {item.reference_image_url && (
                                    <img src={item.reference_image_url} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="w-16 h-16 rounded-lg bg-secondary/30 border border-dashed border-border/50 flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+</span>
                            </div>
                        </div>
                        */}
                    </div>

                    {/* Info Section */}
                    <div className="space-y-6">
                        {/* Title & Category */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                                    {item.category}
                                </Badge>
                                {isVerified && (
                                    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                                        <Sparkles className="w-3 h-3" />
                                        Community Verified
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{item.subject}</h1>
                        </div>

                        {/* Attribute Pills */}
                        <div className="flex flex-wrap gap-2">
                            {item.year && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        {(() => {
                                            const yearStr = item.year.toString();
                                            const numbers = yearStr.match(/\d{4}/g)?.map(Number) || [];
                                            if (numbers.length === 0) return yearStr;
                                            const min = Math.min(...numbers);
                                            const max = Math.max(...numbers);
                                            return min === max ? `${min}` : `${min} - ${max}`;
                                        })()}
                                    </span>
                                </div>
                            )}
                            {item.tag_brand && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <Tag className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{item.tag_brand}</span>
                                </div>
                            )}
                            {item.stitch_type && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <Link2 className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{item.stitch_type} Stitch</span>
                                </div>
                            )}
                            {item.material && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <span className="text-sm font-medium">🧵 {item.material}</span>
                                </div>
                            )}
                            {item.body_type && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <span className="text-sm font-medium">👕 {item.body_type}</span>
                                </div>
                            )}
                            {item.origin && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                                    <span className="text-sm font-medium">{getFlagEmoji(item.origin)} {item.origin}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {item.description && (
                            <div className="space-y-2 pt-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Description
                                </h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {item.description}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Variants Section */}
                        <VariantsSection variants={variants} parentShirt={parentShirt} />

                        {/* Related Shirts */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                Related Shirts
                            </h3>
                            <RelatedShirts
                                vaultItemId={item.id}
                                onSuggestClick={() => setShowRelatedModal(true)}
                            />
                        </div>

                        {/* Item History */}
                        <div className="space-y-2 pt-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    Item History
                                </span>
                                {showHistory ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>
                            {showHistory && <ItemHistory vaultItemId={item.id} />}
                        </div>

                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-2xl font-bold">
                                            <Users className="w-5 h-5 text-muted-foreground" />
                                            {item.verification_count || 0}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Verifications</p>
                                    </div>
                                    <div className="w-px h-10 bg-border/50" />
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-lg font-medium text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            {new Date(item.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Added</p>
                                    </div>
                                </div>
                                <VoteButtons
                                    targetType="vault_item"
                                    targetId={item.id}
                                    initialUpvotes={item.upvotes || 0}
                                    initialDownvotes={item.downvotes || 0}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {user && !hasVerified && (
                                <Button
                                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
                                    onClick={handleVerify}
                                    disabled={verifying}
                                >
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    {verifying ? "Verifying..." : "I own this shirt • Verify (+2 karma)"}
                                </Button>
                            )}

                            {hasVerified && (
                                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">You verified this entry</span>
                                </div>
                            )}

                            {user && profile && hasPermission(getTierFromKarma(profile.karma_score || 0), "edit_typos") && (
                                <Button
                                    variant="outline"
                                    className="w-full h-11"
                                    onClick={() => setShowEditModal(true)}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Suggest an Edit
                                </Button>
                            )}

                            {user && (
                                <IsoButton
                                    userId={user.id}
                                    vaultId={item.id}
                                    vaultSubject={item.subject}
                                />
                            )}
                        </div>

                        {/* Activity Section */}
                        {contributions.length > 0 && (
                            <div className="pt-4 border-t border-border/50">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    Recent Activity
                                </h3>
                                <div className="space-y-2">
                                    {contributions.slice(0, 5).map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary">
                                                        {(c.user?.display_name || "U").charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium">{c.user?.display_name || "Unknown"}</span>
                                                    <span className="text-sm text-muted-foreground ml-1.5">
                                                        {c.action === "create" && "created this"}
                                                        {c.action === "verify" && "verified this"}
                                                        {c.action === "edit" && "edited this"}
                                                        {c.action === "add_image" && "added image"}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-sm font-semibold text-green-500">+{c.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {showEditModal && item && user && (
                <EditProposalModal
                    vaultItemId={item.id}
                    userId={user.id}
                    currentValues={{
                        subject: item.subject,
                        category: item.category,
                        year: item.year,
                        tag_brand: item.tag_brand,
                        reference_image_url: item.reference_image_url,
                    }}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        setShowEditModal(false);
                        refreshData();
                    }}
                />
            )}

            {/* Suggest Related Modal */}
            {showRelatedModal && item && (
                <SuggestRelatedModal
                    vaultItemId={item.id}
                    vaultItemSubject={item.subject}
                    onClose={() => setShowRelatedModal(false)}
                    onSuccess={() => {
                        setShowRelatedModal(false);
                        // Related shirts will auto-refresh
                    }}
                />
            )}
        </div>
    );
}
