// Karma tier definitions and utilities

export const KARMA_TIERS = {
    newcomer: { min: 0, label: 'Newcomer', icon: '🌱', color: 'text-gray-400' },
    contributor: { min: 50, label: 'Contributor', icon: '🌿', color: 'text-green-500' },
    trusted: { min: 200, label: 'Trusted', icon: '🌳', color: 'text-blue-500' },
    expert: { min: 500, label: 'Expert', icon: '⭐', color: 'text-yellow-500' },
    curator: { min: 1000, label: 'Curator', icon: '👑', color: 'text-purple-500' },
    moderator: { min: Infinity, label: 'Moderator', icon: '🛡️', color: 'text-red-500' },
} as const;

export type KarmaTier = keyof typeof KARMA_TIERS;

export const KARMA_ACTIONS = {
    // Earning karma
    create_vault_verified: { points: 15, description: 'Created verified vault entry' },
    create_vault_unverified: { points: 5, description: 'Created vault entry (pending verification)' },
    entry_verified: { points: 3, description: 'Your entry was verified' },
    add_image: { points: 5, description: 'Added reference image' },
    edit_accepted: { points: 3, description: 'Edit was accepted' },
    vote_received: { points: 1, description: 'Received upvote' },
    verify_entry: { points: 2, description: 'Verified an entry' },

    // Losing karma
    edit_rejected: { points: -2, description: 'Edit was rejected' },
    duplicate_flagged: { points: -5, description: 'Entry flagged as duplicate' },
    downvote_received: { points: -1, description: 'Received downvote' },
    entry_removed: { points: -20, description: 'Entry removed by moderators' },
} as const;

export type KarmaAction = keyof typeof KARMA_ACTIONS;

// Permission checks
export const PERMISSIONS = {
    // Anyone
    view: ['newcomer', 'contributor', 'trusted', 'expert', 'curator', 'moderator'],
    verify_own: ['newcomer', 'contributor', 'trusted', 'expert', 'curator', 'moderator'],
    create_entry: ['newcomer', 'contributor', 'trusted', 'expert', 'curator', 'moderator'],

    // Contributor+ (50+)
    edit_typos: ['contributor', 'trusted', 'expert', 'curator', 'moderator'],
    add_images: ['contributor', 'trusted', 'expert', 'curator', 'moderator'],

    // Trusted+ (200+)
    edit_all_fields: ['trusted', 'expert', 'curator', 'moderator'],
    vote_on_edits: ['trusted', 'expert', 'curator', 'moderator'],

    // Expert+ (500+)
    approve_edits: ['expert', 'curator', 'moderator'],
    flag_entries: ['expert', 'curator', 'moderator'],

    // Curator+ (1000+)
    delete_duplicates: ['curator', 'moderator'],
    feature_entries: ['curator', 'moderator'],

    // Moderator only
    admin_actions: ['moderator'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function getTierFromKarma(karma: number): KarmaTier {
    if (karma >= 1000) return 'curator';
    if (karma >= 500) return 'expert';
    if (karma >= 200) return 'trusted';
    if (karma >= 50) return 'contributor';
    return 'newcomer';
}

export function hasPermission(tier: KarmaTier, permission: Permission, isAdmin: boolean = false): boolean {
    if (isAdmin) return true;
    const allowedTiers = PERMISSIONS[permission] as readonly string[];
    return allowedTiers.includes(tier);
}

export function getNextTier(tier: KarmaTier): KarmaTier | null {
    const tiers: KarmaTier[] = ['newcomer', 'contributor', 'trusted', 'expert', 'curator'];
    const currentIndex = tiers.indexOf(tier);
    if (currentIndex === -1 || currentIndex === tiers.length - 1) return null;
    return tiers[currentIndex + 1];
}

export function getKarmaToNextTier(karma: number): number | null {
    const tier = getTierFromKarma(karma);
    const nextTier = getNextTier(tier);
    if (!nextTier) return null;
    return KARMA_TIERS[nextTier].min - karma;
}
