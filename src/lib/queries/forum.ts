import { createClient } from "@/lib/supabase/server";
import { ForumCategory, ForumThread, ForumPost } from "@/types/forum";

/**
 * SERVER-SIDE QUERIES
 */

export async function getForumCategories() {
    const supabase = await createClient();

    // We want categories with thread counts
    // Note: Supabase count queries for multiple categories can be tricky in one go
    // We'll fetch categories and let the DB handle stats if we had a view, 
    // but for now simple fetch is okay.
    const { data, error } = await supabase
        .from("forum_categories")
        .select(`
            *,
            forum_threads(count)
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (error) throw error;

    return data.map(cat => ({
        ...cat,
        thread_count: cat.forum_threads?.[0]?.count || 0
    })) as ForumCategory[];
}

export async function getThreadsByCategory(categorySlug: string, page = 1, pageSize = 20) {
    const supabase = await createClient();

    // Get category ID first
    const { data: category } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();

    if (!category) return null;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from("forum_threads")
        .select(`
            *,
            author:profiles(display_name, avatar_url, karma_tier),
            forum_posts(count)
        `, { count: "exact" })
        .eq("category_id", category.id)
        .order("is_pinned", { ascending: false })
        .order("last_post_at", { ascending: false })
        .range(from, to);

    if (error) throw error;

    const threads = data.map(thread => ({
        ...thread,
        reply_count: thread.forum_posts?.[0]?.count || 0
    })) as ForumThread[];

    return { threads, count };
}

export async function getThreadBySlug(slug: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("forum_threads")
        .select(`
            *,
            author:profiles(display_name, avatar_url, karma_tier),
            category:forum_categories(name, slug, color)
        `)
        .eq("slug", slug)
        .single();

    if (error) throw error;
    return data as ForumThread;
}

export async function getThreadPosts(threadId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("forum_posts")
        .select(`
            *,
            author:profiles(display_name, avatar_url, karma_tier, karma_score)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data as ForumPost[];
}

/**
 * CLIENT-SIDE ACTIONS (Helper placeholders for mutations)
 * These would typically be called from Server Actions or client components
 */

export async function incrementThreadView(threadId: string) {
    const supabase = await createClient();
    // Use an RPC or manual update (RLS needs to allow or use service role)
    // For now, simple update
    await supabase.rpc('increment_thread_views', { t_id: threadId });
}
