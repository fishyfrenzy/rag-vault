"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ShirtCard } from "@/components/inventory/ShirtCard";
import { cn } from "@/lib/utils";
import { CollectionCard } from "@/components/inventory/CollectionCard";
import { CreateCollectionModal } from "@/components/inventory/CreateCollectionModal";
import { ProfileSettingsModal } from "@/components/profile/ProfileSettingsModal";
import { AchievementBadge, achievementConfig } from "@/components/profile/AchievementBadge";
import { IsoManageModal } from "@/components/profile/IsoList";
import { CollectionSelector, ShirtSelector } from "@/components/profile/SlotSelectors";
import { Settings, Share, LogOut, MapPin, Calendar, Plus, Pencil, Search, X, LayoutGrid, Folder, Shirt, Star, GripVertical, Check, ChevronUp, ChevronDown } from "lucide-react";

interface InventoryItem {
    id: string;
    size: string;
    condition: number;
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

interface Collection {
    id: string;
    name: string;
    color: string;
    is_private: boolean;
    itemCount: number;
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
    username?: string | null;
    bio?: string | null;
    location?: string | null;
    birth_year?: number | null;
    profile_visibility?: { bio: boolean; location: boolean; age: boolean };
    selected_title?: string | null;
    profile_slots?: ProfileSlot[];
    created_at?: string;
    is_private?: boolean;
}

// Default slots
const DEFAULT_SLOTS: ProfileSlot[] = [
    { type: 'all_shirts', title: 'All Shirts' },
    { type: 'collections', title: 'Collections' },
    { type: 'iso', title: 'ISO List' },
];

const SLOT_OPTIONS = [
    { type: 'all_shirts', label: 'All Shirts', icon: Shirt, description: 'Show all your shirts' },
    { type: 'collections', label: 'Collections', icon: Folder, description: 'Show your collections' },
    { type: 'iso', label: 'ISO List', icon: Search, description: 'What you\'re looking for' },
    { type: 'collection', label: 'Specific Collection', icon: Folder, description: 'Choose one collection to feature' },
    { type: 'shirts', label: 'Featured Shirts', icon: Star, description: 'Hand-pick shirts to showcase' },
];

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isoList, setIsoList] = useState<IsoItem[]>([]);
    const [profileData, setProfileData] = useState<ProfileData>({});
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingSlots, setEditingSlots] = useState(false);
    const [showSlotPicker, setShowSlotPicker] = useState(false);
    const [showCollectionSelector, setShowCollectionSelector] = useState(false);
    const [showShirtSelector, setShowShirtSelector] = useState(false);
    const [showIsoModal, setShowIsoModal] = useState(false);
    const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
    const pendingSlotsRef = useRef<ProfileSlot[] | null>(null);

    const fetchDataRef = useRef<() => Promise<void>>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);

            // Fetch extended profile data
            const { data: extProfile } = await supabase
                .from('profiles')
                .select('username, bio, location, birth_year, profile_visibility, selected_title, profile_slots, created_at, is_private')
                .eq('id', user.id)
                .single();

            if (extProfile) setProfileData(extProfile as ProfileData);

            // Fetch Inventory
            const { data: invData } = await supabase
                .from('user_inventory')
                .select(`
                    id, size, condition, price, for_sale, images, body_type, tag, collection_id,
                    vault:the_vault(subject, category, year, reference_image_url)
                `)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (invData) setInventory(invData as unknown as InventoryItem[]);

            // Fetch Collections
            const { data: colData } = await supabase
                .from('user_collections')
                .select('*')
                .eq('user_id', user.id);

            if (colData) {
                const collectionsWithCounts = (colData as Collection[]).map((col) => ({
                    ...col,
                    itemCount: (invData || []).filter(item => item.collection_id === col.id).length,
                }));
                setCollections(collectionsWithCounts);
            }

            // Fetch Achievements
            const { data: achData } = await supabase
                .from('user_achievements')
                .select('achievement_type, tier')
                .eq('user_id', user.id);

            if (achData) {
                setAchievements(achData.map(a => ({
                    type: a.achievement_type as Achievement['type'],
                    tier: a.tier,
                })));
            }

            // Fetch ISO List
            const { data: isoData } = await supabase
                .from('user_iso_list')
                .select(`
                    id, priority,
                    vault:the_vault(subject, category, reference_image_url)
                `)
                .eq('user_id', user.id)
                .order('priority', { ascending: false });

            if (isoData) setIsoList(isoData as unknown as IsoItem[]);

            setLoading(false);
        };

        fetchDataRef.current = fetchData;
        fetchData();
    }, [user]);

    if (!user || !profile) return null;

    const visibility = profileData.profile_visibility || { bio: true, location: true, age: false };

    // Parse selected title
    const selectedTitle = profileData.selected_title;
    let displayedTitle: Achievement | null = null;
    if (selectedTitle) {
        const [type, tierStr] = selectedTitle.split('_');
        const tier = parseInt(tierStr);
        if (type && tier && achievements.some(a => a.type === type && a.tier >= tier)) {
            displayedTitle = { type: type as Achievement['type'], tier };
        }
    }

    // Get highest achievement of each type for title selection
    const highestAchievements = achievements.reduce((acc, ach) => {
        if (!acc[ach.type] || ach.tier > acc[ach.type].tier) {
            acc[ach.type] = ach;
        }
        return acc;
    }, {} as Record<string, Achievement>);

    // Profile slots (use defaults if none set)
    const slots: ProfileSlot[] = profileData.profile_slots?.length ?
        profileData.profile_slots :
        DEFAULT_SLOTS;

    const age = profileData.birth_year ? new Date().getFullYear() - profileData.birth_year : null;
    const memberSince = profileData.created_at
        ? new Date(profileData.created_at).getFullYear()
        : profile.updated_at
            ? new Date(profile.updated_at).getFullYear()
            : 'Recently';

    const handleTitleSelect = async (titleKey: string | null) => {
        await supabase
            .from('profiles')
            .update({ selected_title: titleKey })
            .eq('id', user.id);
        setProfileData(prev => ({ ...prev, selected_title: titleKey }));
    };

    const updateSlots = async (newSlots: ProfileSlot[]) => {
        await supabase
            .from('profiles')
            .update({ profile_slots: newSlots })
            .eq('id', user.id);
        setProfileData(prev => ({ ...prev, profile_slots: newSlots }));
    };

    const addSlot = async (slotType: string) => {
        // For specific collection or shirts, show selector first
        if (slotType === 'collection') {
            setShowSlotPicker(false);
            setShowCollectionSelector(true);
            return;
        }
        if (slotType === 'shirts') {
            setShowSlotPicker(false);
            setShowShirtSelector(true);
            return;
        }

        const newSlot: ProfileSlot = {
            type: slotType as ProfileSlot['type'],
            title: SLOT_OPTIONS.find(o => o.type === slotType)?.label || slotType
        };
        const newSlots = [...slots, newSlot];
        await updateSlots(newSlots);
        setShowSlotPicker(false);
    };

    const addCollectionSlot = async (collectionId: string, collectionName: string) => {
        const newSlot: ProfileSlot = {
            type: 'collection',
            id: collectionId,
            title: collectionName
        };
        const newSlots = [...slots, newSlot];
        await updateSlots(newSlots);
        setShowCollectionSelector(false);
    };

    const addShirtsSlot = async (shirtIds: string[], title: string) => {
        const newSlot: ProfileSlot = {
            type: 'shirts',
            ids: shirtIds,
            title: title
        };
        const newSlots = [...slots, newSlot];
        await updateSlots(newSlots);
        setShowShirtSelector(false);
    };

    const removeSlot = async (index: number) => {
        const newSlots = slots.filter((_, i) => i !== index);
        await updateSlots(newSlots);
    };

    // Drag and drop for slots
    const handleSlotDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedSlotIndex(index);
        pendingSlotsRef.current = null;
    };

    const handleSlotDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedSlotIndex === null || draggedSlotIndex === index) return;

        const currentSlots = pendingSlotsRef.current || slots;
        const newSlots = [...currentSlots];
        const draggedSlot = newSlots[draggedSlotIndex];
        newSlots.splice(draggedSlotIndex, 1);
        newSlots.splice(index, 0, draggedSlot);

        pendingSlotsRef.current = newSlots;
        setProfileData(prev => ({ ...prev, profile_slots: newSlots }));
        setDraggedSlotIndex(index);
    };

    const handleSlotDragEnd = async () => {
        setDraggedSlotIndex(null);
        // Save the pending slots order
        if (pendingSlotsRef.current) {
            await updateSlots(pendingSlotsRef.current);
            pendingSlotsRef.current = null;
        }
    };

    const moveSlot = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === slots.length - 1)
        ) return;

        const newSlots = [...slots];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newSlots[index], newSlots[newIndex]] = [newSlots[newIndex], newSlots[index]];

        // Optimistic update
        setProfileData(prev => ({ ...prev, profile_slots: newSlots }));
        await updateSlots(newSlots);
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
                        <p className="text-sm text-muted-foreground col-span-full">No shirts yet</p>
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
                            itemCount={col.itemCount}
                            color={col.color}
                            isPrivate={col.is_private}
                        />
                    ))}
                    {collections.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full">No collections yet</p>
                    )}
                </div>
            );
        }

        if (slot.type === 'iso') {
            return (
                <div className="space-y-2">
                    {isoList.length > 0 ? (
                        <>
                            {isoList.slice(0, 5).map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
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
                            ))}
                            <button
                                onClick={() => setShowIsoModal(true)}
                                className="w-full text-center py-2 text-sm text-primary hover:underline"
                            >
                                Manage ISO List →
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No items in your ISO list</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                Browse the vault to add shirts you're looking for
                            </p>
                        </div>
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
                        <p className="text-sm text-muted-foreground col-span-full">No items in this collection</p>
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

    return (
        <MobileContainer className="pb-24">
            {/* Header */}
            <div className="bg-background pt-8 pb-6 px-6 border-b border-border/40">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-4">
                        <div className="w-20 h-20 rounded-full bg-secondary border-2 border-background overflow-hidden shadow-sm">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-2xl font-bold">
                                    {profile.display_name?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
                                {displayedTitle && (
                                    <AchievementBadge achievement={displayedTitle} size="sm" />
                                )}
                            </div>

                            {/* Location & Age */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {visibility.location && profileData.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {profileData.location}
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
                            {visibility.bio && profileData.bio && (
                                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                    {profileData.bio}
                                </p>
                            )}

                            {/* Title selector */}
                            {Object.keys(highestAchievements).length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-2">Choose your title:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleTitleSelect(null)}
                                            className={cn(
                                                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                                !selectedTitle
                                                    ? "bg-primary/10 border-primary/30 text-primary"
                                                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            None
                                        </button>
                                        {Object.entries(highestAchievements).map(([type, ach]) => {
                                            const config = achievementConfig[type as keyof typeof achievementConfig];
                                            const tierInfo = config.tiers[ach.tier - 1];
                                            const titleKey = `${type}_${ach.tier}`;
                                            return (
                                                <button
                                                    key={titleKey}
                                                    onClick={() => handleTitleSelect(titleKey)}
                                                    className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                                        selectedTitle === titleKey
                                                            ? "bg-primary/10 border-primary/30 text-primary"
                                                            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {tierInfo.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-secondary/50"
                            onClick={() => {
                                const url = `${window.location.origin}/u/${user.id}`;
                                navigator.clipboard.writeText(url);
                                alert('Profile link copied!');
                            }}
                        >
                            <Share className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-secondary/50"
                            onClick={() => setShowSettingsModal(true)}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-destructive/10 hover:bg-destructive/20"
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = "/";
                            }}
                        >
                            <LogOut className="w-4 h-4 text-destructive" />
                        </Button>
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
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Display</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSlots(!editingSlots)}
                        className="text-muted-foreground"
                    >
                        <Pencil className="w-4 h-4 mr-1" />
                        {editingSlots ? 'Done' : 'Edit'}
                    </Button>
                </div>

                <div className="space-y-4">
                    {slots.map((slot, index) => (
                        <div
                            key={index}
                            draggable={editingSlots}
                            onDragStart={(e) => handleSlotDragStart(e, index)}
                            onDragOver={(e) => handleSlotDragOver(e, index)}
                            onDragEnd={handleSlotDragEnd}
                            className={cn(
                                "relative p-4 rounded-2xl bg-secondary/20 border border-border/50 transition-all",
                                editingSlots && "cursor-move border-dashed",
                                draggedSlotIndex === index && "opacity-50 scale-[0.98] ring-2 ring-primary"
                            )}
                        >
                            {/* Delete button in edit mode */}
                            {editingSlots && (
                                <button
                                    onClick={() => removeSlot(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}

                            {/* Move buttons in edit mode */}
                            {editingSlots && (
                                <div className="absolute top-2 right-8 flex gap-1 z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveSlot(index, 'up'); }}
                                        disabled={index === 0}
                                        className="p-1 rounded-full bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveSlot(index, 'down'); }}
                                        disabled={index === slots.length - 1}
                                        className="p-1 rounded-full bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                {editingSlots && (
                                    <GripVertical className="w-5 h-5 text-primary/60 -ml-1" />
                                )}
                                {getSlotIcon(slot.type)}
                                {slot.title || slot.type}
                            </h3>
                            {renderSlotContent(slot)}
                        </div>
                    ))}

                    {/* Add slot button */}
                    {slots.length < 5 && (
                        <button
                            onClick={() => setShowSlotPicker(true)}
                            className="w-full p-6 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
                        >
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="text-sm font-medium">Add Display Section</span>
                        </button>
                    )}
                </div>
            </div>

            {
                loading && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground tracking-wide">Loading...</p>
                    </div>
                )
            }

            {/* Slot Picker Modal */}
            {
                showSlotPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Add Section</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowSlotPicker(false)} className="rounded-full">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {SLOT_OPTIONS.map(opt => {
                                    // Can add multiple collection/shirts but only one of each generic type
                                    const alreadyHas = opt.type !== 'collection' && opt.type !== 'shirts' &&
                                        slots.some(s => s.type === opt.type);
                                    if (alreadyHas) return null;

                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.type}
                                            onClick={() => addSlot(opt.type)}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                                        >
                                            <div className="p-2 rounded-lg bg-secondary">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{opt.label}</p>
                                                <p className="text-xs text-muted-foreground">{opt.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Collection Selector */}
            {
                showCollectionSelector && (
                    <CollectionSelector
                        userId={user.id}
                        onSelect={addCollectionSlot}
                        onClose={() => setShowCollectionSelector(false)}
                    />
                )
            }

            {/* Shirt Selector */}
            {
                showShirtSelector && (
                    <ShirtSelector
                        userId={user.id}
                        onSelect={addShirtsSlot}
                        onClose={() => setShowShirtSelector(false)}
                    />
                )
            }

            {/* ISO Manage Modal */}
            {
                showIsoModal && (
                    <IsoManageModal
                        userId={user.id}
                        onClose={() => {
                            setShowIsoModal(false);
                            if (fetchDataRef.current) fetchDataRef.current();
                        }}
                    />
                )
            }

            {/* Modals */}
            {
                showCreateModal && (
                    <CreateCollectionModal
                        userId={user.id}
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            if (fetchDataRef.current) fetchDataRef.current();
                        }}
                    />
                )
            }

            {
                showSettingsModal && (
                    <ProfileSettingsModal
                        userId={user.id}
                        currentUsername={profileData.username}
                        currentBio={profileData.bio}
                        currentLocation={profileData.location}
                        currentBirthYear={profileData.birth_year}
                        currentVisibility={visibility}
                        currentIsPrivate={profileData.is_private}
                        onClose={() => setShowSettingsModal(false)}
                        onSave={() => {
                            if (fetchDataRef.current) fetchDataRef.current();
                        }}
                    />
                )
            }
        </MobileContainer >
    );
}
