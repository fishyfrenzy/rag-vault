"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useSearchParams } from "next/navigation";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase/client";
import { VaultItemCard } from "@/components/vault/VaultItemCard";
import { VaultItemListCard } from "@/components/vault/VaultItemListCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPill, QuickFilter } from "@/components/ui/FilterPill";
import { EmptyState, NoResultsState } from "@/components/ui/EmptyState";
import { SkeletonCardGrid } from "@/components/ui/skeleton";
import {
    Search,
    CheckCircle,
    Plus,
    Grid3X3,
    List,
    SlidersHorizontal,
    ChevronDown,
    Image as ImageIcon,
    Sparkles,
    Clock,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { VaultItemSummary, SortOption } from "@/types/vault";
import { VAULT_CATEGORIES, SORT_OPTIONS } from "@/types/vault";

const ITEMS_PER_PAGE = 24;

interface QuickFilters {
    verifiedOnly: boolean;
    hasImage: boolean;
    newThisWeek: boolean;
}

export default function VaultPage() {
    // Read URL params for initial filter values
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";
    const initialYear = searchParams.get("year") || "";
    const initialStitch = searchParams.get("stitch") || "";
    const initialOrigin = searchParams.get("origin") || "";
    const initialBrand = searchParams.get("brand") || "";

    // State
    const [items, setItems] = useState<VaultItemSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState(initialSearch);
    const [debouncedSearch] = useDebounce(search, 500);
    const [category, setCategory] = useState(initialCategory);
    const [yearFilter, setYearFilter] = useState(initialYear);
    const [stitchFilter, setStitchFilter] = useState(initialStitch);
    const [originFilter, setOriginFilter] = useState(initialOrigin);
    const [brandFilter, setBrandFilter] = useState(initialBrand);
    const [sortBy, setSortBy] = useState<SortOption>("verified");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [quickFilters, setQuickFilters] = useState<QuickFilters>({
        verifiedOnly: false,
        hasImage: false,
        newThisWeek: false,
    });
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    // Refs
    const headerRef = useRef<HTMLDivElement>(null);
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(true);

    // Handle scroll for sticky header shadow
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Handle category scroll affordance
    const updateScrollFades = useCallback(() => {
        const el = categoryScrollRef.current;
        if (!el) return;
        setShowLeftFade(el.scrollLeft > 10);
        setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }, []);

    useEffect(() => {
        const el = categoryScrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollFades);
        updateScrollFades();
        return () => el.removeEventListener("scroll", updateScrollFades);
    }, [updateScrollFades]);

    // Fetch items
    const fetchItems = useCallback(async (offset = 0, append = false) => {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        try {
            let query = supabase
                .from("the_vault")
                .select("id, subject, brand, title, slug, category, year, tag_brand, stitch_type, origin, reference_image_url, verification_count, created_at", { count: "exact" });

            // Full-text search using PostgreSQL search_vector
            if (debouncedSearch) {
                const searchTerm = debouncedSearch.trim();

                // Try full-text search first (requires migration 026)
                // Format: replace hyphens/underscores with spaces, join with &
                const ftsQuery = searchTerm
                    .replace(/[-_]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length > 0)
                    .join(' & ');

                if (ftsQuery) {
                    query = query.textSearch('search_vector', ftsQuery, {
                        type: 'websearch',
                        config: 'english'
                    });
                }
            }

            // Category filter
            if (category !== "All") {
                query = query.eq("category", category);
            }

            // Year filter from URL
            if (yearFilter) {
                query = query.eq("year", yearFilter);
            }

            // Stitch type filter from URL
            if (stitchFilter) {
                query = query.ilike("stitch_type", `%${stitchFilter}%`);
            }

            // Origin filter from URL
            if (originFilter) {
                query = query.ilike("origin", `%${originFilter}%`);
            }

            // Brand filter from URL
            if (brandFilter) {
                query = query.ilike("brand", `%${brandFilter}%`);
            }

            // Quick filters
            if (quickFilters.verifiedOnly) {
                query = query.gte("verification_count", 3);
            }
            if (quickFilters.hasImage) {
                query = query.not("reference_image_url", "is", null);
            }
            if (quickFilters.newThisWeek) {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte("created_at", weekAgo.toISOString());
            }

            // Sorting
            switch (sortBy) {
                case "newest":
                    query = query.order("created_at", { ascending: false });
                    break;
                case "alphabetical":
                    query = query.order("subject", { ascending: true });
                    break;
                case "score":
                    query = query.order("score", { ascending: false });
                    break;
                case "verified":
                default:
                    query = query
                        .order("verification_count", { ascending: false })
                        .order("created_at", { ascending: false });
                    break;
            }

            // Pagination
            query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

            const { data, error, count } = await query;

            if (error) {
                console.error("Error fetching vault:", error);
                return;
            }

            const newItems = (data as VaultItemSummary[]) || [];

            if (append) {
                setItems(prev => [...prev, ...newItems]);
            } else {
                setItems(newItems);
            }

            setTotalCount(count || 0);
            setHasMore(offset + newItems.length < (count || 0));
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, category, yearFilter, stitchFilter, originFilter, brandFilter, sortBy, quickFilters]);

    // Refetch when filters change
    useEffect(() => {
        fetchItems(0, false);
    }, [fetchItems]);

    // Load more handler
    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchItems(items.length, true);
        }
    };

    // Toggle quick filter
    const toggleQuickFilter = (key: keyof QuickFilters) => {
        setQuickFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Get active sort label
    const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Sort";

    return (
        <MobileContainer className="pb-24">
            {/* Header */}
            <div
                ref={headerRef}
                className={cn(
                    "sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4 space-y-4 transition-shadow duration-200",
                    isScrolled ? "shadow-md border-border/60" : "border-border/40"
                )}
            >
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">The Vault</h1>
                        {totalCount > 0 && !loading && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {totalCount.toLocaleString()} items
                            </p>
                        )}
                    </div>
                    <Link href="/vault/new">
                        <Button size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Item
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search shirts, descriptions, tags..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4"
                    />
                </div>

                {/* Category Filter with scroll affordance */}
                <div className="relative">
                    {showLeftFade && (
                        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    )}
                    <div
                        ref={categoryScrollRef}
                        className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
                    >
                        {VAULT_CATEGORIES.map((cat) => (
                            <FilterPill
                                key={cat}
                                active={category === cat}
                                onClick={() => setCategory(cat)}
                            >
                                {cat}
                            </FilterPill>
                        ))}
                    </div>
                    {showRightFade && (
                        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                    )}
                </div>

                {/* Quick Filters & Controls Row */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Quick Filters */}
                    <div className="flex gap-2 flex-wrap flex-1">
                        <QuickFilter
                            label="Verified"
                            icon={<CheckCircle className="w-3 h-3" />}
                            active={quickFilters.verifiedOnly}
                            onClick={() => toggleQuickFilter("verifiedOnly")}
                        />
                        <QuickFilter
                            label="Has Image"
                            icon={<ImageIcon className="w-3 h-3" />}
                            active={quickFilters.hasImage}
                            onClick={() => toggleQuickFilter("hasImage")}
                        />
                        <QuickFilter
                            label="New This Week"
                            icon={<Sparkles className="w-3 h-3" />}
                            active={quickFilters.newThisWeek}
                            onClick={() => toggleQuickFilter("newThisWeek")}
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                        >
                            <SlidersHorizontal className="w-3 h-3" />
                            {activeSortLabel}
                            <ChevronDown className={cn("w-3 h-3 transition-transform", showSortDropdown && "rotate-180")} />
                        </Button>
                        {showSortDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setShowSortDropdown(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-30 py-1 min-w-[140px]">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors",
                                                sortBy === option.value && "text-primary font-medium"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "grid"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:bg-secondary"
                            )}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-2 transition-colors",
                                viewMode === "list"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:bg-secondary"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                {/* Loading State */}
                {loading ? (
                    <SkeletonCardGrid count={8} />
                ) : items.length === 0 ? (
                    /* Empty State */
                    debouncedSearch || category !== "All" || Object.values(quickFilters).some(Boolean) ? (
                        <NoResultsState query={debouncedSearch} />
                    ) : (
                        <EmptyState
                            title="No items in the vault yet"
                            description="Be the first to add a vintage shirt to the collection!"
                            action={{
                                label: "Add the first entry",
                                href: "/vault/new"
                            }}
                        />
                    )
                ) : (
                    /* Items Grid/List */
                    <>
                        {viewMode === "grid" ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {items.map((item, index) => (
                                    <Link href={`/vault/${item.slug || item.id}`} key={item.id}>
                                        <div className="relative">
                                            <VaultItemCard
                                                subject={item.title || item.subject}
                                                category={item.category}
                                                imageUrl={item.reference_image_url}
                                                priority={index < 4}
                                            />
                                            {item.verification_count >= 3 && (
                                                <div className="absolute top-2 right-2 bg-green-500/90 text-white rounded-full p-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <Link href={`/vault/${item.slug || item.id}`} key={item.id}>
                                        <VaultItemListCard item={item} />
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-8">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-4 h-4" />
                                            Load More ({totalCount - items.length} remaining)
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </MobileContainer>
    );
}
