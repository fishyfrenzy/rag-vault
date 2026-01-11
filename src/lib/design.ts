/**
 * Design System Constants
 * Centralized design tokens and style constants
 */

// Color variants for badges, buttons, categories
export const BADGE_VARIANTS = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-primary text-primary-foreground",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
    Music: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Motorcycle: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    Movie: "bg-red-500/10 text-red-400 border-red-500/30",
    Art: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    Sport: "bg-green-500/10 text-green-400 border-green-500/30",
    Advertising: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    Other: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export const CATEGORY_ICONS: Record<string, string> = {
    Music: "🎸",
    Motorcycle: "🏍️",
    Movie: "🎬",
    Art: "🎨",
    Sport: "⚽",
    Advertising: "📺",
    Other: "📦",
};

// Karma tier styling
export const KARMA_TIER_STYLES: Record<string, { color: string; icon: string; bgClass: string }> = {
    newcomer: { color: "text-gray-400", icon: "🌱", bgClass: "bg-gray-500/10" },
    contributor: { color: "text-green-500", icon: "🌿", bgClass: "bg-green-500/10" },
    trusted: { color: "text-blue-500", icon: "🌳", bgClass: "bg-blue-500/10" },
    expert: { color: "text-yellow-500", icon: "⭐", bgClass: "bg-yellow-500/10" },
    curator: { color: "text-purple-500", icon: "👑", bgClass: "bg-purple-500/10" },
    moderator: { color: "text-red-500", icon: "🛡️", bgClass: "bg-red-500/10" },
};

// Card styling
export const CARD_STYLES = {
    base: "rounded-xl border border-border/50 bg-card overflow-hidden",
    interactive: "rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer",
    elevated: "rounded-xl border border-border/50 bg-card overflow-hidden shadow-xl",
    glass: "rounded-xl border border-border/30 bg-background/80 backdrop-blur-md overflow-hidden",
} as const;

// Button size presets
export const BUTTON_SIZES = {
    xs: "h-7 px-2 text-xs",
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    xl: "h-14 px-8 text-lg",
} as const;

// Spacing constants
export const SPACING = {
    page: "px-4 md:px-6",
    section: "py-6 md:py-8",
    card: "p-4 md:p-6",
    gap: "gap-4 md:gap-6",
} as const;

// Animation presets
export const ANIMATIONS = {
    fadeIn: "animate-in fade-in duration-300",
    slideUp: "animate-in slide-in-from-bottom-4 duration-300",
    slideDown: "animate-in slide-in-from-top-4 duration-300",
    scaleIn: "animate-in zoom-in-95 duration-200",
    bounceIn: "animate-in zoom-in-95 duration-300 ease-out",
} as const;

// Grid layouts
export const GRID_LAYOUTS = {
    cards: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
    list: "flex flex-col gap-4",
    masonry: "columns-2 md:columns-3 lg:columns-4 gap-4",
} as const;

// Condition scale colors (1-10)
export const CONDITION_COLORS: Record<number, string> = {
    10: "text-green-500",
    9: "text-green-400",
    8: "text-lime-500",
    7: "text-yellow-500",
    6: "text-yellow-400",
    5: "text-orange-400",
    4: "text-orange-500",
    3: "text-red-400",
    2: "text-red-500",
    1: "text-red-600",
};

// Z-index scale
export const Z_INDEX = {
    dropdown: 50,
    modal: 100,
    toast: 150,
    tooltip: 200,
} as const;
