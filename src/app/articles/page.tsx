import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ArticleCard } from "@/components/article/ArticleCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ARTICLE_TYPES } from "@/types/article";
import type { ArticleSummary, ArticleType } from "@/types/article";

export const metadata: Metadata = {
    title: "Articles | RagVault",
    description: "Read the latest articles, guides, and features about vintage t-shirts on RagVault.",
};

export default async function ArticlesPage() {
    const supabase = await createClient();

    // Fetch published articles
    const { data: articles } = await supabase
        .from("articles")
        .select(`
            id, slug, title, subtitle, excerpt, hero_image_url, article_type, published_at,
            author:profiles!author_id(display_name, avatar_url)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();
        isAdmin = profile?.is_admin || false;
    }

    // Group articles by type
    const transformedArticles = articles?.map((article) => ({
        ...article,
        // Transform author array to single object (Supabase returns relations as arrays)
        author: Array.isArray(article.author) ? article.author[0] : article.author
    })) || [];

    const featuredArticle = transformedArticles[0];
    const restArticles = transformedArticles.slice(1);

    // Group by type for display
    const articlesByType: Record<string, ArticleSummary[]> = {};
    restArticles.forEach((article) => {
        const type = article.article_type;
        if (!articlesByType[type]) {
            articlesByType[type] = [];
        }
        articlesByType[type].push(article as unknown as ArticleSummary);
    });

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="bg-secondary/30 border-b">
                <div className="container max-w-6xl mx-auto px-4 py-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold">Articles</h1>
                            <p className="text-muted-foreground mt-2">
                                Guides, features, and stories from the vintage community
                            </p>
                        </div>
                        {isAdmin && (
                            <Link href="/articles/new">
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    New Article
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="container max-w-6xl mx-auto px-4 py-8 space-y-12">
                {/* Featured Article */}
                {featuredArticle && (
                    <section>
                        <ArticleCard
                            article={featuredArticle as unknown as ArticleSummary}
                            variant="featured"
                        />
                    </section>
                )}

                {/* Articles Grid */}
                {restArticles.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {restArticles.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article as unknown as ArticleSummary}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {(!articles || articles.length === 0) && (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground mb-4">No articles published yet.</p>
                        {isAdmin && (
                            <Link href="/articles/new">
                                <Button>Create the first article</Button>
                            </Link>
                        )}
                    </div>
                )}

                {/* Article Types Legend */}
                <section className="border-t pt-8">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Article Categories</h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(ARTICLE_TYPES).map(([key, { label, icon }]) => (
                            <span
                                key={key}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm"
                            >
                                {icon} {label}
                            </span>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
