/**
 * Feature Flags and Tier Definitions for Kinetic Studio.
 * This shared logic ensures consistency between the UI and server enforcement.
 */

export enum PlanTier {
    FREE = 'FREE',
    PRO = 'PRO',
    TEAMS = 'TEAMS',
}

export interface Entitlements {
    maxProjects: number;
    maxElementsPerProject: number;
    canCollaborate: boolean;
    hasHighResExport: boolean;
    canCustomBranding: boolean;
}

export const TIER_CONFIGS: Record<PlanTier, Entitlements> = {
    [PlanTier.FREE]: {
        maxProjects: 3,
        maxElementsPerProject: 50,
        canCollaborate: false,
        hasHighResExport: false,
        canCustomBranding: false,
    },
    [PlanTier.PRO]: {
        maxProjects: 50,
        maxElementsPerProject: 500,
        canCollaborate: true,
        hasHighResExport: true,
        canCustomBranding: false,
    },
    [PlanTier.TEAMS]: {
        maxProjects: Infinity,
        maxElementsPerProject: Infinity,
        canCollaborate: true,
        hasHighResExport: true,
        canCustomBranding: true,
    },
};

/**
 * Logic to check if a specific feature or limit is allowed.
 */
export function checkEntitlement(
    tier: PlanTier,
    usage: { projectCount: number; currentElementCount: number },
    feature: keyof Entitlements
): { allowed: boolean; reason?: string } {
    const config = TIER_CONFIGS[tier];

    // 1. Check Feature Access
    if (typeof config[feature] === 'boolean' && !config[feature]) {
        return { allowed: false, reason: `Feature ${feature} is restricted to higher tiers.` };
    }

    // 2. Check Usage Limits
    if (feature === 'maxProjects' && usage.projectCount >= config.maxProjects) {
        return { allowed: false, reason: 'Project limit reached for your current plan.' };
    }

    if (feature === 'maxElementsPerProject' && usage.currentElementCount >= config.maxElementsPerProject) {
        return { allowed: false, reason: 'Layer limit reached for this project.' };
    }

    return { allowed: true };
}
