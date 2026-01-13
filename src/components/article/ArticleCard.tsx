import Link from "next/link";
import { cn } from "@/lib/utils";
import { ARTICLE_TYPES } from "@/types/article";
import type { ArticleSummary } from "@/types/article";
import { Calendar } from "lucide-react";

interface ArticleCardProps {
    article: ArticleSummary;
    variant?: "default" | "featured" | "compact";
    className?: string;
}

export function ArticleCard({ article, variant = "default", className }: ArticleCardProps) {
    const typeInfo = ARTICLE_TYPES[article.article_type];

    if (variant === "featured") {
        return (
            <Link href={`/articles/${article.slug}`} className={cn("block group", className)}>
                <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-secondary">
                    {article.hero_image_url && (
                        <img
                            src={article.hero_image_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium opacity-90">
                                {typeInfo?.icon} {typeInfo?.label}
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold leading-tight mb-2 group-hover:text-primary-foreground transition-colors">
                            {article.title}
                        </h2>
                        {article.subtitle && (
                            <p className="text-lg opacity-90">{article.subtitle}</p>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    if (variant === "compact") {
        return (
            <Link href={`/articles/${article.slug}`} className={cn("block group", className)}>
                <div className="flex gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                    {article.hero_image_url && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                            <img
                                src={article.hero_image_url}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground">
                            {typeInfo?.icon} {typeInfo?.label}
                        </span>
                        <h3 className="font-semibold text-sm mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                        </h3>
                        {article.published_at && (
                            <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // Default card
    return (
        <Link href={`/articles/${article.slug}`} className={cn("block group", className)}>
            <div className="space-y-3">
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-secondary">
                    {article.hero_image_url ? (
                        <img
                            src={article.hero_image_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                            {typeInfo?.icon}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-medium">
                            {typeInfo?.icon} {typeInfo?.label}
                        </span>
                        {article.published_at && (
                            <span className="text-xs text-muted-foreground">
                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                    </h3>
                    {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
