"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createReply(threadId: string, content: string, path: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to reply");

    const { error } = await supabase.from('forum_posts').insert({
        thread_id: threadId,
        author_id: user.id,
        content
    });

    if (error) throw error;

    revalidatePath(path);
}

export async function createThread(formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to create a thread");

    const categoryId = formData.get("categoryId") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const linkedVaultId = formData.get("linkedVaultId") as string || null;

    // Generate slug from title
    const { data: slugData, error: slugError } = await supabase.rpc('generate_thread_slug', { p_title: title });
    if (slugError) throw slugError;
    const slug = slugData;

    const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
            category_id: categoryId,
            author_id: user.id,
            title,
            slug,
            content,
            linked_vault_id: linkedVaultId
        })
        .select('slug')
        .single();

    if (threadError) throw threadError;

    // Get category slug for redirect
    const { data: category } = await supabase
        .from('forum_categories')
        .select('slug')
        .eq('id', categoryId)
        .single();

    revalidatePath(`/forums/${category?.slug}`);
    redirect(`/forums/${category?.slug}/${thread.slug}`);
}
