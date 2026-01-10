"use client";

import { cn } from "@/lib/utils";
import { Trophy, Edit3, ShoppingBag, Shirt } from "lucide-react";

interface Achievement {
    type: 'karma' | 'edits' | 'collection' | 'sales';
    tier: number;
}

interface AchievementBadgeProps {
    achievement: Achievement;
    size?: 'sm' | 'md' | 'lg';
}

const achievementConfig = {
    karma: {
        icon: Trophy,
        label: 'Karma',
        tiers: [
            { name: 'Newcomer', threshold: 50 },
            { name: 'Contributor', threshold: 200 },
            { name: 'Respected', threshold: 500 },
            { name: 'Veteran', threshold: 1000 },
            { name: 'Legend', threshold: 5000 },
        ],
        colors: ['bg-amber-500/20 text-amber-400 border-amber-500/30', 'bg-amber-500/30 text-amber-300 border-amber-500/40', 'bg-yellow-500/30 text-yellow-300 border-yellow-500/40', 'bg-yellow-400/40 text-yellow-200 border-yellow-400/50', 'bg-gradient-to-r from-yellow-400/50 to-amber-400/50 text-yellow-100 border-yellow-300/50'],
    },
    edits: {
        icon: Edit3,
        label: 'Edits',
        tiers: [
            { name: 'Editor', threshold: 5 },
            { name: 'Curator', threshold: 20 },
            { name: 'Archivist', threshold: 50 },
            { name: 'Historian', threshold: 100 },
            { name: 'Vault Keeper', threshold: 500 },
        ],
        colors: ['bg-blue-500/20 text-blue-400 border-blue-500/30', 'bg-blue-500/30 text-blue-300 border-blue-500/40', 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40', 'bg-cyan-400/40 text-cyan-200 border-cyan-400/50', 'bg-gradient-to-r from-cyan-400/50 to-blue-400/50 text-cyan-100 border-cyan-300/50'],
    },
    collection: {
        icon: Shirt,
        label: 'Collection',
        tiers: [
            { name: 'Collector', threshold: 5 },
            { name: 'Enthusiast', threshold: 20 },
            { name: 'Connoisseur', threshold: 50 },
            { name: 'Hoarder', threshold: 100 },
            { name: 'Grail Hunter', threshold: 250 },
        ],
        colors: ['bg-purple-500/20 text-purple-400 border-purple-500/30', 'bg-purple-500/30 text-purple-300 border-purple-500/40', 'bg-violet-500/30 text-violet-300 border-violet-500/40', 'bg-violet-400/40 text-violet-200 border-violet-400/50', 'bg-gradient-to-r from-violet-400/50 to-purple-400/50 text-violet-100 border-violet-300/50'],
    },
    sales: {
        icon: ShoppingBag,
        label: 'Sales',
        tiers: [
            { name: 'First Sale', threshold: 1 },
            { name: 'Seller', threshold: 5 },
            { name: 'Dealer', threshold: 15 },
            { name: 'Merchant', threshold: 50 },
            { name: 'Tycoon', threshold: 100 },
        ],
        colors: ['bg-green-500/20 text-green-400 border-green-500/30', 'bg-green-500/30 text-green-300 border-green-500/40', 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40', 'bg-emerald-400/40 text-emerald-200 border-emerald-400/50', 'bg-gradient-to-r from-emerald-400/50 to-green-400/50 text-emerald-100 border-emerald-300/50'],
    },
};

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
    const config = achievementConfig[achievement.type];
    const tierInfo = config.tiers[achievement.tier - 1];
    const colorClass = config.colors[achievement.tier - 1];
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs gap-1',
        md: 'px-3 py-1.5 text-sm gap-1.5',
        lg: 'px-4 py-2 text-base gap-2',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border font-medium",
                sizeClasses[size],
                colorClass
            )}
            title={`${tierInfo.name} - ${config.label} Tier ${achievement.tier}`}
        >
            <Icon className={iconSizes[size]} />
            <span>{tierInfo.name}</span>
        </div>
    );
}

export function AchievementsRow({ achievements }: { achievements: Achievement[] }) {
    if (achievements.length === 0) return null;

    // Group by type and get highest tier for each
    const highestByType = achievements.reduce((acc, ach) => {
        if (!acc[ach.type] || ach.tier > acc[ach.type].tier) {
            acc[ach.type] = ach;
        }
        return acc;
    }, {} as Record<string, Achievement>);

    const topAchievements = Object.values(highestByType);

    return (
        <div className="flex flex-wrap gap-2">
            {topAchievements.map((ach) => (
                <AchievementBadge key={`${ach.type}-${ach.tier}`} achievement={ach} size="sm" />
            ))}
        </div>
    );
}

export { achievementConfig };
