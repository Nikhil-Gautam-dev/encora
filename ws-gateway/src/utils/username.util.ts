import { User } from "../models/user.schema";

const ANIME_PREFIXES = [
    "shadow", "phantom", "ryuu", "kage", "yami", "oni", "zero",
    "neo", "void", "cyber", "nova", "lunar", "storm", "dark",
    "hyper", "blade", "sage", "ghost", "rogue", "titan"
];

const ANIME_SUFFIXES = [
    "blade", "soul", "fire", "storm", "void", "mind", "star",
    "fang", "wave", "pulse", "drift", "shift", "forge", "core"
];

const slugify = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDigits = (n = 3): string =>
    Math.floor(Math.random() * (10 ** n)).toString().padStart(n, "0");

/**
 * Generates a unique, anime-flavoured username from a Google display name.
 * Format examples: shadow_nikhil · nikhil_bladesoul · neo_nikhil042
 */
export const generateUniqueUsername = async (displayName: string): Promise<string> => {
    const base = slugify(displayName.split(" ")[0]); // first name only

    const candidates = [
        `${randomItem(ANIME_PREFIXES)}_${base}`,
        `${base}_${randomItem(ANIME_SUFFIXES)}`,
        `${randomItem(ANIME_PREFIXES)}_${base}_${randomItem(ANIME_SUFFIXES)}`,
    ];

    for (const candidate of candidates) {
        const taken = await User.exists({ username: candidate });
        if (!taken) return candidate;
    }

    // Fallback: prefix + base + random digits
    for (let attempt = 0; attempt < 10; attempt++) {
        const username = `${randomItem(ANIME_PREFIXES)}_${base}${randomDigits()}`;
        const taken = await User.exists({ username });
        if (!taken) return username;
    }

    // Last resort: full random
    return `${randomItem(ANIME_PREFIXES)}_${randomDigits(5)}`;
};
