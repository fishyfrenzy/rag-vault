import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";
import { ArticleCard } from "@/components/article/ArticleCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { ARTICLE_TYPES } from "@/types/article";
import type { Article, ArticleBlock, ArticleSummary, ArticleType } from "@/types/article";

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: article } = await supabase
        .from("articles")
        .select("title, subtitle, excerpt, hero_image_url, article_type")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

    if (!article) {
        return { title: "Article Not Found | RagVault" };
    }

    const typeInfo = ARTICLE_TYPES[article.article_type as ArticleType];

    return {
        title: `${article.title} | ${typeInfo?.label || 'Article'} | RagVault`,
        description: article.excerpt || article.subtitle || `Read ${article.title} on RagVault`,
        openGraph: {
            title: article.title,
            description: article.excerpt || article.subtitle || undefined,
            type: "article",
            images: article.hero_image_url ? [{ url: article.hero_image_url }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title: article.title,
            description: article.excerpt || article.subtitle || undefined,
            images: article.hero_image_url ? [article.hero_image_url] : undefined,
        },
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch article
    const { data: article } = await supabase
        .from("articles")
        .select(`
            *,
            author:profiles!author_id(id, display_name, username, avatar_url)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .single();

    if (!article) {
        notFound();
    }

    // Fetch blocks
    const { data: blocks } = await supabase
        .from("article_blocks")
        .select("*")
        .eq("article_id", article.id)
        .order("sort_order", { ascending: true });

    // Increment view count (fire and forget)
    supabase.rpc("increment_article_views", { p_article_id: article.id });

    // Fetch related articles
    const { data: relatedArticles } = await supabase
        .from("articles")
        .select("id, slug, title, subtitle, excerpt, hero_image_url, article_type, published_at")
        .eq("status", "published")
        .neq("id", article.id)
        .eq("article_type", article.article_type)
        .order("published_at", { ascending: false })
        .limit(3);

    // Check if current user is admin (for edit button)
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

    const typeInfo = ARTICLE_TYPES[article.article_type as ArticleType];

    return (
        <article className="min-h-screen pb-24">
            {/* Hero */}
            {article.hero_image_url && (
                <div className="relative h-[50vh] min-h-[400px] max-h-[600px]">
                    <img
                        src={article.hero_image_url}
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                </div>
            )}

            {/* Content */}
            <div className="container max-w-3xl mx-auto px-4">
                {/* Header */}
                <header className={article.hero_image_url ? "-mt-32 relative z-10" : "pt-8"}>
                    {/* Back button */}
                    <div className="mb-6 flex items-center justify-between">
                        <Link href="/articles">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                All Articles
                            </Button>
                        </Link>
                        {isAdmin && (
                            <Link href={`/articles/${slug}/edit`}>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Type badge */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {typeInfo?.icon} {typeInfo?.label}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                        {article.title}
                    </h1>

                    {/* Subtitle */}
                    {article.subtitle && (
                        <p className="text-xl text-muted-foreground mb-6">
                            {article.subtitle}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-8 border-b">
                        {article.author && (
                            <Link
                                href={`/u/${article.author.username || article.author.id}`}
                                className="flex items-center gap-2 hover:text-foreground transition-colors"
                            >
                                {article.author.avatar_url ? (
                                    <img
                                        src={article.author.avatar_url}
                                        alt={article.author.display_name}
                                        className="w-6 h-6 rounded-full"
                                    />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                                {article.author.display_name}
                            </Link>
                        )}
                        {article.published_at && (
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        )}
                        {article.view_count > 0 && (
                            <span className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                {article.view_count.toLocaleString()} views
                            </span>
                        )}
                    </div>
                </header>

                {/* Article Body */}
                <div className="py-8">
                    <ArticleRenderer blocks={(blocks as ArticleBlock[]) || []} />
                </div>

                {/* Related Articles */}
                {relatedArticles && relatedArticles.length > 0 && (
                    <div className="border-t pt-12">
                        <h2 className="text-2xl font-bold mb-6">More {typeInfo?.label} Articles</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {relatedArticles.map((related) => (
                                <ArticleCard
                                    key={related.id}
                                    article={related as ArticleSummary}
                                    variant="compact"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}
