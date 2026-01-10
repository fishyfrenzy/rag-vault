"use client";

import Link from "next/link";
import { DollarSign, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShirtCardProps {
    id: string;
    subject: string;
    category?: string;
    year?: number | null;
    size?: string | null;
    condition?: number | null;
    price?: number | null;
    forSale?: boolean;
    imageUrl?: string | null;
    bodyType?: string | null;
    tag?: string | null;
}

const conditionLabels: Record<number, { label: string; color: string }> = {
    10: { label: "Deadstock", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    9: { label: "Mint", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    8: { label: "Excellent", color: "bg-green-500/15 text-green-400 border-green-500/25" },
    7: { label: "Good", color: "bg-lime-500/15 text-lime-400 border-lime-500/25" },
    6: { label: "Fair", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
    5: { label: "Average", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    4: { label: "Below Avg", color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
    3: { label: "Poor", color: "bg-orange-600/15 text-orange-500 border-orange-600/25" },
    2: { label: "Bad", color: "bg-red-500/15 text-red-400 border-red-500/25" },
    1: { label: "Thrashed", color: "bg-red-600/15 text-red-500 border-red-600/25" },
};

export function ShirtCard({
    id,
    subject,
    category,
    year,
    size,
    condition,
    price,
    forSale,
    imageUrl,
    bodyType,
    tag,
}: ShirtCardProps) {
    const conditionInfo = condition ? conditionLabels[condition] : null;

    return (
        <Link href={`/collection/${id}`}>
            <article className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden bg-secondary/50">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={subject}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl text-muted-foreground/20">👕</span>
                        </div>
                    )}

                    {/* For Sale Badge */}
                    {forSale && price && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-green-500 text-white text-sm font-bold shadow-lg flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {price.toLocaleString()}
                        </div>
                    )}

                    {/* Size Badge */}
                    {size && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-bold">
                            {size}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                    <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {subject}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {category && (
                            <Badge variant="outline" className="text-xs">
                                {category}
                            </Badge>
                        )}
                        {year && (
                            <Badge variant="secondary" className="text-xs">
                                {year}
                            </Badge>
                        )}
                        {bodyType && (
                            <Badge variant="secondary" className="text-xs capitalize">
                                {bodyType}
                            </Badge>
                        )}
                    </div>

                    {/* Condition & Listing Status */}
                    <div className="flex items-center justify-between pt-1">
                        {conditionInfo ? (
                            <span className={`text-sm font-semibold ${conditionInfo.color.includes('emerald') ? 'text-emerald-400' : conditionInfo.color.includes('green') ? 'text-green-400' : conditionInfo.color.includes('lime') ? 'text-lime-400' : conditionInfo.color.includes('yellow') ? 'text-yellow-400' : conditionInfo.color.includes('amber') ? 'text-amber-400' : conditionInfo.color.includes('orange') ? 'text-orange-400' : 'text-red-400'}`}>
                                {conditionInfo.label}
                            </span>
                        ) : (
                            <span />
                        )}

                        {forSale ? (
                            <div className="flex items-center gap-1 text-green-400">
                                <span className="text-xs font-medium">For Sale</span>
                                {price && (
                                    <span className="text-sm font-bold">${price.toLocaleString()}</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground">Collection</span>
                        )}
                    </div>
                </div>

                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </article>
        </Link>
    );
}
