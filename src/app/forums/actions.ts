"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createThreadSchema, createReplySchema } from "@/lib/validations";

export type ActionResult = {
    success: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
};

export async function createReply(threadId: string, content: string, path: string): Promise<ActionResult> {
    // Validate input
    const validated = createReplySchema.safeParse({ threadId, content });
    if (!validated.success) {
        const fieldErrors: Record<string, string> = {};
        validated.error.issues.forEach((issue) => {
            fieldErrors[issue.path.join(".")] = issue.message;
        });
        return { success: false, error: "Validation failed", fieldErrors };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Must be logged in to reply" };
    }

    const { error } = await supabase.from('forum_posts').insert({
        thread_id: validated.data.threadId,
        author_id: user.id,
        content: validated.data.content
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(path);
    return { success: true };
}

export async function createThread(formData: FormData): Promise<ActionResult | never> {
    // Validate input
    const rawData = {
        categoryId: formData.get("categoryId") as string,
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        linkedVaultId: (formData.get("linkedVaultId") as string) || null,
    };

    const validated = createThreadSchema.safeParse(rawData);
    if (!validated.success) {
        const fieldErrors: Record<string, string> = {};
        validated.error.issues.forEach((issue) => {
            fieldErrors[issue.path.join(".")] = issue.message;
        });
        return { success: false, error: "Validation failed", fieldErrors };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Must be logged in to create a thread" };
    }

    const { categoryId, title, content, linkedVaultId } = validated.data;

    // Generate slug from title
    const { data: slugData, error: slugError } = await supabase.rpc('generate_thread_slug', { p_title: title });
    if (slugError) {
        return { success: false, error: slugError.message };
    }
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

    if (threadError) {
        return { success: false, error: threadError.message };
    }

    // Get category slug for redirect
    const { data: category } = await supabase
        .from('forum_categories')
        .select('slug')
        .eq('id', categoryId)
        .single();

    revalidatePath(`/forums/${category?.slug}`);
    redirect(`/forums/${category?.slug}/${thread.slug}`);
}
