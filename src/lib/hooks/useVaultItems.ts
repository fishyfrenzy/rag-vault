/**
 * useVaultItems Hook
 * TanStack Query hook for fetching vault items with infinite scroll
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { VaultItemSummary, SortOption } from "@/types/vault";

const ITEMS_PER_PAGE = 24;

export interface VaultFilters {
    search: string;
    category: string;
    yearFilter: string;
    stitchFilter: string;
    originFilter: string;
    brandFilter: string;
    sortBy: SortOption;
    quickFilters: {
        verifiedOnly: boolean;
        hasImage: boolean;
        newThisWeek: boolean;
    };
}

interface VaultPage {
    items: VaultItemSummary[];
    totalCount: number;
    hasMore: boolean;
    nextOffset: number;
}

async function fetchVaultPage(
    offset: number,
    filters: VaultFilters
): Promise<VaultPage> {
    const { search, category, yearFilter, stitchFilter, originFilter, brandFilter, sortBy, quickFilters } = filters;

    let query = supabase
        .from("the_vault")
        .select("id, subject, brand, title, slug, category, year, tag_brand, stitch_type, origin, reference_image_url, verification_count, created_at", { count: "exact" });

    // Search using normalized search_text column
    if (search) {
        const searchTerm = search
            .trim()
            .toLowerCase()
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ');

        if (searchTerm) {
            query = query.ilike('search_text', `%${searchTerm}%`);
        }
    }

    // Category filter
    if (category !== "All") {
        query = query.eq("category", category);
    }

    // URL-based filters
    if (yearFilter) {
        query = query.eq("year", yearFilter);
    }
    if (stitchFilter) {
        query = query.ilike("stitch_type", `%${stitchFilter}%`);
    }
    if (originFilter) {
        query = query.ilike("origin", `%${originFilter}%`);
    }
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
        throw new Error(error.message);
    }

    const items = (data as VaultItemSummary[]) || [];
    const totalCount = count || 0;

    return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
        nextOffset: offset + items.length,
    };
}

export function useVaultItems(filters: VaultFilters) {
    return useInfiniteQuery({
        queryKey: ["vault", filters],
        queryFn: ({ pageParam = 0 }) => fetchVaultPage(pageParam, filters),
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
        initialPageParam: 0,
        staleTime: 60 * 1000, // 1 minute
    });
}

// Helper to flatten pages into single array
export function flattenVaultPages(pages: VaultPage[] | undefined): VaultItemSummary[] {
    if (!pages) return [];
    return pages.flatMap(page => page.items);
}
