"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CollectionCard } from "@/components/inventory/CollectionCard";
import { AchievementBadge, achievementConfig } from "@/components/profile/AchievementBadge";
import { MapPin, Calendar, Lock, ArrowLeft, Shirt, Folder, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryItem {
    id: string;
    images: { view: string; url: string }[] | null;
    collection_id: string | null;
    vault: {
        subject: string;
        category: string;
        reference_image_url: string | null;
    };
}

interface Collection {
    id: string;
    name: string;
    color: string;
    is_private: boolean;
}

interface Achievement {
    type: 'karma' | 'edits' | 'collection' | 'sales';
    tier: number;
}

interface ProfileSlot {
    type: 'all_shirts' | 'collections' | 'iso' | 'collection' | 'shirts';
    id?: string;
    ids?: string[];
    title?: string;
}

interface IsoItem {
    id: string;
    vault: { subject: string; category: string; reference_image_url?: string };
    priority: number;
}

interface ProfileData {
    id: string;
    display_name: string;
    avatar_url?: string;
    karma_score: number;
    bio?: string | null;
    location?: string | null;
    birth_year?: number | null;
    profile_visibility?: { bio: boolean; location: boolean; age: boolean };
    selected_title?: string | null;
    profile_slots?: ProfileSlot[];
    created_at?: string;
    is_private?: boolean;
}

export default function PublicProfilePage() {
    const params = useParams();
    const userId = params.id as string;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isoList, setIsoList] = useState<IsoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            setLoading(true);

            // Try fetching by ID first, then by username
            let profileData = null;
            let profileUserId = userId;

            // Check if it looks like a UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

            if (isUUID) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, display_name, avatar_url, karma_score, bio, location, birth_year, profile_visibility, selected_title, profile_slots, created_at, is_private')
                    .eq('id', userId)
                    .single();
                profileData = data;
            } else {
                // Try by username
                const { data } = await supabase
                    .from('profiles')
                    .select('id, display_name, avatar_url, karma_score, bio, location, birth_year, profile_visibility, selected_title, profile_slots, created_at, is_private')
                    .eq('username', userId.toLowerCase())
                    .single();
                profileData = data;
                if (data) profileUserId = data.id;
            }

            if (!profileData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            // Check if profile is private
            if (profileData.is_private) {
                setProfile(profileData as ProfileData);
                setLoading(false);
                return;
            }

            setProfile(profileData as ProfileData);

            // Fetch public inventory (not in private collections)
            const { data: invData } = await supabase
                .from('user_inventory')
                .select(`
                    id, images, collection_id,
                    vault:the_vault(subject, category, reference_image_url)
                `)
                .eq('user_id', profileUserId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Fetch collections (only public ones)
            const { data: colData } = await supabase
                .from('user_collections')
                .select('id, name, color, is_private')
                .eq('user_id', profileUserId)
                .eq('is_private', false);

            if (colData) setCollections(colData);

            // Filter out items in private collections
            const privateColIds = new Set(
                (await supabase
                    .from('user_collections')
                    .select('id')
                    .eq('user_id', profileUserId)
                    .eq('is_private', true)
                ).data?.map(c => c.id) || []
            );

            if (invData) {
                const publicItems = (invData as unknown as InventoryItem[]).filter(
                    item => !item.collection_id || !privateColIds.has(item.collection_id)
                );
                setInventory(publicItems);
            }

            // Fetch achievements
            const { data: achData } = await supabase
                .from('user_achievements')
                .select('achievement_type, tier')
                .eq('user_id', profileUserId);

            if (achData) {
                setAchievements(achData.map(a => ({
                    type: a.achievement_type as Achievement['type'],
                    tier: a.tier,
                })));
            }

            // Fetch ISO list
            const { data: isoData } = await supabase
                .from('user_iso_list')
                .select(`
                    id, priority,
                    vault:the_vault(subject, category, reference_image_url)
                `)
                .eq('user_id', profileUserId)
                .order('created_at', { ascending: true });

            if (isoData) setIsoList(isoData as unknown as IsoItem[]);

            setLoading(false);
        };

        fetchProfile();
    }, [userId]);

    if (loading) {
        return (
            <MobileContainer className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </MobileContainer>
        );
    }

    if (notFound) {
        return (
            <MobileContainer className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
                <p className="text-muted-foreground mb-6">This user doesn't exist or has been removed.</p>
                <Link href="/">
                    <Button><ArrowLeft className="w-4 h-4 mr-2" /> Back Home</Button>
                </Link>
            </MobileContainer>
        );
    }

    if (profile?.is_private) {
        return (
            <MobileContainer className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{profile.display_name}</h1>
                <p className="text-muted-foreground mb-6">This profile is private.</p>
                <Link href="/">
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back Home</Button>
                </Link>
            </MobileContainer>
        );
    }

    if (!profile) return null;

    const visibility = profile.profile_visibility || { bio: true, location: true, age: false };

    // Parse selected title
    let displayedTitle: Achievement | null = null;
    if (profile.selected_title) {
        const [type, tierStr] = profile.selected_title.split('_');
        const tier = parseInt(tierStr);
        if (type && tier && achievements.some(a => a.type === type && a.tier >= tier)) {
            displayedTitle = { type: type as Achievement['type'], tier };
        }
    }

    const slots: ProfileSlot[] = profile.profile_slots?.length ?
        profile.profile_slots :
        [{ type: 'all_shirts', title: 'Collection' }];

    const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
    const memberSince = profile.created_at
        ? new Date(profile.created_at).getFullYear()
        : 'Recently';

    const getSlotIcon = (type: string) => {
        switch (type) {
            case 'all_shirts': return <Shirt className="w-4 h-4" />;
            case 'collections': return <Folder className="w-4 h-4" />;
            case 'iso': return <Search className="w-4 h-4" />;
            case 'collection': return <Folder className="w-4 h-4" />;
            case 'shirts': return <Star className="w-4 h-4" />;
            default: return null;
        }
    };

    const renderSlotContent = (slot: ProfileSlot) => {
        if (slot.type === 'all_shirts') {
            return (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {inventory.slice(0, 12).map(item => (
                        <Link key={item.id} href={`/collection/${item.id}`}>
                            <div className="aspect-square rounded-xl bg-secondary overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                                {item.images?.[0]?.url || item.vault?.reference_image_url ? (
                                    <img src={item.images?.[0]?.url || item.vault?.reference_image_url || ''} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                                )}
                            </div>
                        </Link>
                    ))}
                    {inventory.length > 12 && (
                        <div className="aspect-square rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-medium text-muted-foreground">
                            +{inventory.length - 12}
                        </div>
                    )}
                    {inventory.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full">No public items</p>
                    )}
                </div>
            );
        }

        if (slot.type === 'collections') {
            return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {collections.slice(0, 8).map(col => (
                        <CollectionCard
                            key={col.id}
                            name={col.name}
                            itemCount={inventory.filter(i => i.collection_id === col.id).length}
                            color={col.color}
                            isPrivate={false}
                        />
                    ))}
                    {collections.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full">No public collections</p>
                    )}
                </div>
            );
        }

        if (slot.type === 'iso') {
            return (
                <div className="space-y-2">
                    {isoList.length > 0 ? (
                        isoList.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                    {item.vault.reference_image_url ? (
                                        <img src={item.vault.reference_image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg">👕</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.vault.subject}</p>
                                    <p className="text-xs text-muted-foreground">{item.vault.category}</p>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    item.priority === 3 ? "bg-red-500/20 text-red-400" :
                                        item.priority === 2 ? "bg-yellow-500/20 text-yellow-400" :
                                            "bg-secondary text-muted-foreground"
                                )}>
                                    {item.priority === 3 ? 'High' : item.priority === 2 ? 'Med' : 'Low'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No ISO items</p>
                    )}
                </div>
            );
        }

        if (slot.type === 'collection' && slot.id) {
            const col = collections.find(c => c.id === slot.id);
            if (!col) return <p className="text-sm text-muted-foreground">Collection not found</p>;
            const colItems = inventory.filter(i => i.collection_id === col.id);
            return (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {colItems.slice(0, 6).map(item => (
                        <Link key={item.id} href={`/collection/${item.id}`}>
                            <div className="aspect-square rounded-xl bg-secondary overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                                {item.images?.[0]?.url || item.vault?.reference_image_url ? (
                                    <img src={item.images?.[0]?.url || item.vault?.reference_image_url || ''} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                                )}
                            </div>
                        </Link>
                    ))}
                    {colItems.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full">No items</p>
                    )}
                </div>
            );
        }

        if (slot.type === 'shirts' && slot.ids) {
            const shirtItems = inventory.filter(i => slot.ids?.includes(i.id));
            return (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {shirtItems.map(item => (
                        <Link key={item.id} href={`/collection/${item.id}`}>
                            <div className="aspect-square rounded-xl bg-secondary overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                                {item.images?.[0]?.url || item.vault?.reference_image_url ? (
                                    <img src={item.images?.[0]?.url || item.vault?.reference_image_url || ''} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            );
        }

        return null;
    };

    return (
        <MobileContainer className="pb-24">
            {/* Back button */}
            <div className="p-4">
                <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>
            </div>

            {/* Header */}
            <div className="bg-background pb-6 px-6 border-b border-border/40">
                <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-full bg-secondary border-2 border-background overflow-hidden shadow-sm flex-shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-2xl font-bold">
                                {profile.display_name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
                            {displayedTitle && (
                                <AchievementBadge achievement={displayedTitle} size="sm" />
                            )}
                        </div>

                        {/* Location & Age */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {visibility.location && profile.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {profile.location}
                                </span>
                            )}
                            {visibility.age && age && (
                                <span>{age} years old</span>
                            )}
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Since {memberSince}
                            </span>
                        </div>

                        {/* Bio */}
                        {visibility.bio && profile.bio && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {profile.bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 mt-6 p-4 bg-secondary/10 rounded-2xl border border-border/50">
                    <div>
                        <p className="text-xl font-bold leading-none">{inventory.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Grails</p>
                    </div>
                    <div className="w-px h-8 bg-border/50" />
                    <div>
                        <p className="text-xl font-bold leading-none">{isoList.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">ISO</p>
                    </div>
                    <div className="w-px h-8 bg-border/50" />
                    <div>
                        <p className="text-xl font-bold leading-none text-primary">{profile.karma_score || 0}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Karma</p>
                    </div>
                </div>
            </div>

            {/* Display Slots */}
            <div className="px-6 py-6 space-y-6">
                {slots.map((slot, index) => (
                    <div key={index} className="p-4 rounded-2xl bg-secondary/20 border border-border/50">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            {getSlotIcon(slot.type)}
                            {slot.title || slot.type}
                        </h3>
                        {renderSlotContent(slot)}
                    </div>
                ))}
            </div>
        </MobileContainer>
    );
}
