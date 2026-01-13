"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Image from "next/image";

interface VaultItemCardProps {
    subject: string;
    category: string;
    size?: string;
    price?: number | null;
    condition?: string;
    imageUrl?: string | null;
    onClick?: () => void;
    className?: string;
    priority?: boolean;
}

export function VaultItemCard({
    subject,
    category,
    size,
    price,
    condition,
    imageUrl,
    onClick,
    className,
    priority = false
}: VaultItemCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
        <div
            onClick={onClick}
            className={cn("group relative flex flex-col space-y-2 cursor-pointer", className)}
        >
            <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary/50 relative">
                {imageUrl && !imageError ? (
                    <>
                        {/* Loading skeleton */}
                        {!imageLoaded && (
                            <div className="absolute inset-0 animate-pulse bg-muted" />
                        )}
                        <Image
                            src={imageUrl}
                            alt={subject}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className={cn(
                                "object-cover transition-all duration-300",
                                "group-hover:scale-105",
                                imageLoaded ? "opacity-100" : "opacity-0"
                            )}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            loading={priority ? "eager" : "lazy"}
                            priority={priority}
                        />
                    </>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground/20 font-bold">
                        {subject.charAt(0).toUpperCase()}
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
                <h3 className="font-semibold text-sm leading-none truncate group-hover:text-primary transition-colors">
                    {subject}
                </h3>
                <p className="text-xs text-muted-foreground">
                    {category} {condition ? `• ${condition}` : ''}
                </p>
            </div>
        </div>
    );
}
