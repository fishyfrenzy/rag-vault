"use client";

import { Badge } from "@/components/ui/badge";
import { cn, formatYearRange } from "@/lib/utils";
import { useState, memo } from "react";
import Image from "next/image";

// Shimmer SVG for blur placeholder - creates smooth loading effect
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1a1a1a" offset="20%" />
      <stop stop-color="#2a2a2a" offset="50%" />
      <stop stop-color="#1a1a1a" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1a1a1a" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
    typeof window === "undefined"
        ? Buffer.from(str).toString("base64")
        : window.btoa(str);

const blurDataURL = `data:image/svg+xml;base64,${toBase64(shimmer(400, 500))}`;

interface VaultItemCardProps {
    subject: string;
    category: string;
    yearStart?: number | null;
    yearEnd?: number | null;
    brand?: string | null;
    size?: string;
    price?: number | null;
    condition?: string;
    imageUrl?: string | null;
    onClick?: () => void;
    className?: string;
    priority?: boolean;
}

export const VaultItemCard = memo(function VaultItemCard({
    subject,
    category,
    yearStart,
    yearEnd,
    brand,
    size,
    price,
    condition,
    imageUrl,
    onClick,
    className,
    priority = false
}: VaultItemCardProps) {
    const [imageError, setImageError] = useState(false);

    // Build display title
    const displayTitle = brand && !subject.toLowerCase().includes(brand.toLowerCase())
        ? `${brand} ${subject}`
        : subject;

    // Format year for display
    const displayYear = formatYearRange(yearStart ?? null, yearEnd ?? null);

    return (
        <div
            onClick={onClick}
            className={cn("group relative flex flex-col space-y-2 cursor-pointer", className)}
        >
            <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary/50 relative">
                {imageUrl && !imageError ? (
                    <Image
                        src={imageUrl}
                        alt={displayTitle}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className={cn(
                            "object-cover transition-transform duration-300",
                            "group-hover:scale-105"
                        )}
                        onError={() => setImageError(true)}
                        loading={priority ? "eager" : "lazy"}
                        priority={priority}
                        placeholder="blur"
                        blurDataURL={blurDataURL}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground/20 font-bold">
                        {displayTitle.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Overlays */}
                {(size || price) && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                        {size && (
                            <Badge
                                variant="secondary"
                                className="backdrop-blur-md bg-black/60 text-white border-0 text-[10px] h-5 px-1.5"
                            >
                                {size}
                            </Badge>
                        )}
                        {price && (
                            <Badge
                                variant="secondary"
                                className="backdrop-blur-md bg-black/60 text-white border-0 text-[10px] h-5 px-1.5"
                            >
                                ${price}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {displayTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {displayYear && `${displayYear} · `}{category}{condition ? ` · ${condition}` : ''}
                </p>
            </div>
        </div>
    );
});
