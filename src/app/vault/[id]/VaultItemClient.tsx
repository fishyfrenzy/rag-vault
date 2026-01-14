"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AddVariantModal } from "@/components/vault/AddVariantModal";
import { SuggestRelatedModal } from "@/components/vault/SuggestRelatedModal";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { VaultTags } from "@/components/vault/VaultTags";
import { VaultImageGallery } from "@/components/vault/VaultImageGallery";
import { EditableSection } from "@/components/vault/InlineEditField";
import type { VaultItem } from "@/types/vault";

const getFlagEmoji = (countryName: string) => {
    if (!countryName) return "🌍";
    const code = countryName.toLowerCase();
    if (code === "usa" || code === "united states" || code === "america") return "🇺🇸";
    if (code === "uk" || code === "united kingdom" || code === "england") return "🇬🇧";
    if (code === "canada") return "🇨🇦";
    if (code === "mexico") return "🇲🇽";
    if (code === "japan") return "🇯🇵";
    if (code === "china") return "🇨🇳";
    if (code === "france") return "🇫🇷";
    if (code === "italy") return "🇮🇹";
    if (code === "germany") return "🇩🇪";
    if (code === "haiti") return "🇭🇹";
    return "🌍";
};

interface VariantItem {
    id: string;
    slug: string | null;
    subject: string;
    variant_type: string | null;
    reference_image_url: string | null;
}

interface ParentShirt {
    id: string;
    slug: string | null;
    subject: string;
    reference_image_url: string | null;
}

interface Contribution {
    id: string;
    action: string;
    points: number;
    created_at: string;
    user: { display_name: string } | null;
}

interface VaultItemClientProps {
    initialItem: VaultItem;
}

export default function VaultItemClient({ initialItem }: VaultItemClientProps) {
    const router = useRouter();
    const { user, profile } = useAuth();
    const [item, setItem] = useState<VaultItem>(initialItem);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [verifying, setVerifying] = useState(false);
    const [hasVerified, setHasVerified] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRelatedModal, setShowRelatedModal] = useState(false);
    const [variants, setVariants] = useState<VariantItem[]>([]);
    const [parentShirt, setParentShirt] = useState<ParentShirt | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showVariantModal, setShowVariantModal] = useState(false);

    useEffect(() => {
        const fetchContributions = async () => {
            const { data } = await supabase
                .from("contributions")
                .select(`id, action, points, created_at, user:profiles(display_name)`)
                .eq("vault_item_id", item.id)
                .order("created_at", { ascending: false })
                .limit(10);
            setContributions((data as unknown as Contribution[]) || []);
        };

        const checkUserVerification = async () => {
            if (!user) return;
            const { data } = await supabase
                .from("contributions")
                .select("id")
                .eq("vault_item_id", item.id)
                .eq("user_id", user.id)
                .eq("action", "verify")
                .limit(1);
            setHasVerified((data && data.length > 0) ?? false);
        };

        const fetchVariants = async () => {
            const { data } = await supabase
                .from("the_vault")
                .select("id, slug, subject, variant_type, reference_image_url")
                .eq("parent_id", item.id)
                .limit(10);
            setVariants((data as VariantItem[]) || []);
        };

        fetchContributions();
        checkUserVerification();
        fetchVariants();

        if (item.parent_id) {
            supabase
                .from("the_vault")
                .select("id, slug, subject, reference_image_url")
                .eq("id", item.parent_id)
                .single()
                .then(({ data }) => {
                    if (data) setParentShirt(data as ParentShirt);
                });
        }
    }, [item.id, item.parent_id, user]);

    const handleVerify = async () => {
        if (!user || hasVerified) return;
        setVerifying(true);

        const { error } = await supabase.from("contributions").insert({
            user_id: user.id,
            vault_item_id: item.id,
            action: "verify",
            points: 2,
        });

        if (!error) {
            await supabase
                .from("the_vault")
                .update({ verification_count: (item.verification_count || 0) + 1 })
                .eq("id", item.id);
            setItem({ ...item, verification_count: (item.verification_count || 0) + 1 });
            setHasVerified(true);
        }
        setVerifying(false);
    };

    const tier = profile ? getTierFromKarma(profile.karma_score || 0) : "newcomer";
    const canEdit = user && profile && hasPermission(tier, "edit_typos");
    const canVerify = user && profile && hasPermission(tier, "verify_own");
    const isVerified = item.verification_count >= 2;

    return (
        <div className="min-h-screen pb-24">
            <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                                {item.category}
                            </Badge>
                            {isVerified && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            )}
                        </div>
                    </div>
                    {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Suggest Edit
                        </Button>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Multi-Image Gallery - Front/Back/Tag Views */}
                    <VaultImageGallery
                        vaultItemId={item.id}
                        fallbackImageUrl={item.reference_image_url}
                    />

                    {/* Details */}
                    <div className="space-y-6">
                        <div>
                            {item.brand ? (
                                <>
                                    <a
                                        href={`/vault?brand=${encodeURIComponent(item.brand)}`}
                                        className="text-sm font-medium text-primary hover:underline uppercase tracking-wider"
                                    >
                                        {item.brand}
                                    </a>
                                    <h1 className="text-2xl font-bold mt-1">{item.title || item.subject}</h1>
                                </>
                            ) : (
                                <h1 className="text-2xl font-bold mb-2">{item.subject}</h1>
                            )}
                            <VoteButtons
                                targetType="vault_item"
                                targetId={item.id}
                                initialUpvotes={item.upvotes}
                                initialDownvotes={item.downvotes}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            {user && (
                                <IsoButton
                                    userId={user.id}
                                    vaultId={item.id}
                                    vaultSubject={item.subject}
                                />
                            )}
                            {canVerify && !hasVerified && (
                                <Button onClick={handleVerify} disabled={verifying} className="flex-1">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {verifying ? "Verifying..." : "Verify Entry"}
                                </Button>
                            )}
                            {hasVerified && (
                                <Button disabled className="flex-1 bg-green-500/20 text-green-500">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Verified
                                </Button>
                            )}
                        </div>

                        {/* Secondary Actions */}
                        <div className="flex gap-2">
                            {user && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowVariantModal(true)}
                                >
                                    <GitBranch className="w-4 h-4 mr-2" />
                                    Add Variant
                                </Button>
                            )}
                        </div>

                        {/* Attributes */}
                        <div className="flex flex-wrap gap-2">
                            {item.year && (
                                <a
                                    href={`/vault?year=${encodeURIComponent(item.year)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{item.year}</span>
                                </a>
                            )}
                            {item.tag_brand && (
                                <a
                                    href={`/vault?search=${encodeURIComponent(item.tag_brand)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <Tag className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{item.tag_brand}</span>
                                </a>
                            )}
                            {item.stitch_type && (
                                <a
                                    href={`/vault?stitch=${encodeURIComponent(item.stitch_type)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <Link2 className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">{item.stitch_type} Stitch</span>
                                </a>
                            )}
                            {item.material && (
                                <a
                                    href={`/vault?search=${encodeURIComponent(item.material)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm font-medium">🧵 {item.material}</span>
                                </a>
                            )}
                            {item.body_type && (
                                <a
                                    href={`/vault?search=${encodeURIComponent(item.body_type)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm font-medium">👕 {item.body_type}</span>
                                </a>
                            )}
                            {item.origin && (
                                <a
                                    href={`/vault?origin=${encodeURIComponent(item.origin)}`}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm font-medium">{getFlagEmoji(item.origin)} {item.origin}</span>
                                </a>
                            )}
                        </div>

                        {/* Description - Inline Editable */}
                        <EditableSection
                            label="Description"
                            vaultItemId={item.id}
                            fieldName="description"
                            currentValue={item.description}
                            fieldType="textarea"
                            placeholder="Add a description about this item's history, significance, or details..."
                            className="pt-2"
                        />

                        {/* Community Tags with Voting */}
                        <VaultTags vaultItemId={item.id} className="pt-2" />

                        {/* Variants */}
                        <VariantsSection variants={variants} parentShirt={parentShirt} />

                        {/* Related Shirts */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                Related Shirts
                            </h3>
                            <RelatedShirts vaultItemId={item.id} onSuggestClick={() => setShowRelatedModal(true)} />
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
                                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showHistory && <ItemHistory vaultItemId={item.id} />}
                        </div>

                        {/* Stats */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
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
                                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Added</p>
                                </div>
                            </div>
                        </div>

                        {/* Contributions */}
                        {contributions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Recent Contributions
                                </h3>
                                <div className="space-y-2">
                                    {contributions.slice(0, 5).map((c) => (
                                        <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary">
                                                        {(c.user?.display_name || "U").charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium">{c.user?.display_name || "Unknown"}</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {c.action === "create" && "created this"}
                                                    {c.action === "verify" && "verified this"}
                                                    {c.action === "edit" && "edited this"}
                                                </span>
                                            </div>
                                            <span className="text-sm font-semibold text-green-500">+{c.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main >

            {/* Modals */}
            {
                showEditModal && user && (
                    <EditProposalModal
                        vaultItemId={item.id}
                        userId={user.id}
                        currentValues={{
                            brand: item.brand,
                            title: item.title,
                            subject: item.subject,
                            category: item.category,
                            year: item.year,
                            tag_brand: item.tag_brand,
                            description: item.description,
                            reference_image_url: item.reference_image_url,
                        }}
                        onClose={() => setShowEditModal(false)}
                        onSuccess={() => setShowEditModal(false)}
                    />
                )
            }

            {
                showRelatedModal && (
                    <SuggestRelatedModal
                        vaultItemId={item.id}
                        vaultItemSubject={item.subject}
                        onClose={() => setShowRelatedModal(false)}
                        onSuccess={() => setShowRelatedModal(false)}
                    />
                )
            }

            {
                showVariantModal && user && (
                    <AddVariantModal
                        parentItem={{
                            id: item.id,
                            brand: item.brand,
                            title: item.title,
                            subject: item.subject,
                            reference_image_url: item.reference_image_url,
                        }}
                        userId={user.id}
                        onClose={() => setShowVariantModal(false)}
                        onSuccess={(variantId) => {
                            setShowVariantModal(false);
                            router.push(`/vault/${variantId}`);
                        }}
                    />
                )
            }
        </div >
    );
}
