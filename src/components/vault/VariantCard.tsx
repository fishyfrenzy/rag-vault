"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface VariantCardProps {
    id: string;
    subject: string;
    variantType: string | null;
    imageUrl: string | null;
    className?: string;
}

const VARIANT_LABELS: Record<string, string> = {
    back_hit: "Back Print",
    front_hit: "Front Hit",
    color: "Color Variant",
    graphic_change: "Graphic Change",
    size_variant: "Size Variant",
    bootleg: "Bootleg",
    reprint: "Reprint",
};

export function VariantCard({ id, subject, variantType, imageUrl, className }: VariantCardProps) {
    return (
        <Link
            href={`/vault/${id}`}
            className={cn(
                "group flex gap-3 p-2 rounded-lg border border-border/50 bg-card/50 hover:border-primary/50 transition-colors",
                className
            )}
        >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={subject}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {subject}
                </p>
                {variantType && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                        {VARIANT_LABELS[variantType] || variantType}
                    </span>
                )}
            </div>
        </Link>
    );
}

interface VariantsSectionProps {
    variants: Array<{
        id: string;
        subject: string;
        variant_type: string | null;
        reference_image_url: string | null;
    }>;
    parentShirt?: {
        id: string;
        subject: string;
        reference_image_url: string | null;
    } | null;
}

export function VariantsSection({ variants, parentShirt }: VariantsSectionProps) {
    const hasContent = variants.length > 0 || parentShirt;

    if (!hasContent) return null;

    return (
        <div className="space-y-3">
            {parentShirt && (
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Base Shirt
                    </p>
                    <VariantCard
                        id={parentShirt.id}
                        subject={parentShirt.subject}
                        variantType={null}
                        imageUrl={parentShirt.reference_image_url}
                    />
                </div>
            )}

            {variants.length > 0 && (
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Variants ({variants.length})
                    </p>
                    <div className="space-y-2">
                        {variants.map((variant) => (
                            <VariantCard
                                key={variant.id}
                                id={variant.id}
                                subject={variant.subject}
                                variantType={variant.variant_type}
                                imageUrl={variant.reference_image_url}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
