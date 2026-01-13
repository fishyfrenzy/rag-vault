import { ArticleEditor } from "@/components/article/ArticleEditor";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Article, ArticleBlock } from "@/types/article";

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    // Check if user is authenticated and admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        redirect("/");
    }

    // Fetch article (by slug or id)
    let query = supabase.from("articles").select("*");

    // Check if slug is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    if (isUUID) {
        query = query.eq("id", slug);
    } else {
        query = query.eq("slug", slug);
    }

    const { data: article } = await query.single();

    if (!article) {
        notFound();
    }

    // Fetch blocks
    const { data: blocks } = await supabase
        .from("article_blocks")
        .select("*")
        .eq("article_id", article.id)
        .order("sort_order", { ascending: true });

    return (
        <ArticleEditor
            article={article as Article}
            blocks={(blocks as ArticleBlock[]) || []}
        />
    );
}
