export const PET_COMPANION_RARITIES = [
	"common",
	"uncommon",
	"rare",
	"epic",
	"legendary",
] as const;

export type PetCompanionRarity = (typeof PET_COMPANION_RARITIES)[number];

export const PET_COMPANION_SPECIES = [
	"duck",
	"goose",
	"blob",
	"cat",
	"dragon",
	"octopus",
	"owl",
	"penguin",
	"turtle",
	"snail",
	"ghost",
	"axolotl",
	"capybara",
	"cactus",
	"robot",
	"rabbit",
	"mushroom",
	"chonk",
] as const;

export type PetCompanionSpecies = (typeof PET_COMPANION_SPECIES)[number];

export const PET_COMPANION_EYES = ["·", "✦", "×", "◉", "@", "°"] as const;
export type PetCompanionEye = (typeof PET_COMPANION_EYES)[number];

export const PET_COMPANION_HATS = [
	"none",
	"crown",
	"tophat",
	"propeller",
	"halo",
	"wizard",
	"beanie",
	"tinyduck",
] as const;

export type PetCompanionHat = (typeof PET_COMPANION_HATS)[number];

export const PET_COMPANION_STAT_NAMES = [
	"DEBUGGING",
	"PATIENCE",
	"CHAOS",
	"WISDOM",
	"SNARK",
] as const;

export type PetCompanionStatName = (typeof PET_COMPANION_STAT_NAMES)[number];

export type PetCompanionStats = Record<PetCompanionStatName, number>;

export const PET_COMPANION_GROWTH_ACTIONS = [
	"mini_chat",
	"code_assistant",
	"voice_chat",
	"companion_panel",
] as const;

export type PetCompanionGrowthAction =
	(typeof PET_COMPANION_GROWTH_ACTIONS)[number];

export type PetCompanionUsage = Record<PetCompanionGrowthAction, number>;
export type PetCompanionActivityExp = Record<PetCompanionGrowthAction, number>;

export const PET_COMPANION_TIERS = [
	"novice",
	"skilled",
	"elite",
	"master",
	"mythic",
] as const;

export type PetCompanionTier = (typeof PET_COMPANION_TIERS)[number];

export type PetCompanionProgress = {
	totalExp: number;
	level: number;
	levelProgress: number;
	levelExpIntoCurrent: number;
	levelExpRequired: number;
	tier: PetCompanionTier;
	intimacy: number;
	breakthroughCount: number;
	nextBreakthroughExp: number | null;
	breakthroughProgress: number;
	lastActiveAt: number;
};

export type StoredPetCompanion = {
	seed: string;
	rarity: PetCompanionRarity;
	species: PetCompanionSpecies;
	eye: PetCompanionEye;
	hat: PetCompanionHat;
	shiny: boolean;
	stats: PetCompanionStats;
	potentialStats: PetCompanionStats;
	usage: PetCompanionUsage;
	activityExp: PetCompanionActivityExp;
	bondExp: number;
	inspirationSeed: number;
	createdAt: number;
	updatedAt: number;
	lastActiveAt: number;
};

export const PET_COMPANION_RARITY_WEIGHTS = {
	common: 60,
	uncommon: 25,
	rare: 10,
	epic: 4,
	legendary: 1,
} as const satisfies Record<PetCompanionRarity, number>;

export const PET_COMPANION_RARITY_FLOOR = {
	common: 5,
	uncommon: 15,
	rare: 25,
	epic: 35,
	legendary: 50,
} as const satisfies Record<PetCompanionRarity, number>;

const PET_COMPANION_GROWTH_WEIGHTS = {
	mini_chat: {
		DEBUGGING: 1.6,
		PATIENCE: 2.2,
		CHAOS: 0.9,
		WISDOM: 1.3,
		SNARK: 0.7,
	},
	code_assistant: {
		DEBUGGING: 2.8,
		PATIENCE: 1.4,
		CHAOS: 0.8,
		WISDOM: 2.4,
		SNARK: 1.0,
	},
	voice_chat: {
		DEBUGGING: 0.8,
		PATIENCE: 2.1,
		CHAOS: 1.6,
		WISDOM: 1.1,
		SNARK: 1.2,
	},
	companion_panel: {
		DEBUGGING: 0,
		PATIENCE: 0,
		CHAOS: 0,
		WISDOM: 0,
		SNARK: 0,
	},
} as const satisfies Record<PetCompanionGrowthAction, Record<PetCompanionStatName, number>>;

const PET_COMPANION_ACTION_EXP = {
	mini_chat: 12,
	code_assistant: 18,
	voice_chat: 15,
	companion_panel: 0,
} as const satisfies Record<PetCompanionGrowthAction, number>;

const PET_COMPANION_BOND_GAIN = {
	mini_chat: 6,
	code_assistant: 5,
	voice_chat: 8,
	companion_panel: 0,
} as const satisfies Record<PetCompanionGrowthAction, number>;

const PET_COMPANION_BREAKTHROUGH_THRESHOLDS = [140, 360, 720, 1240] as const;
const PET_COMPANION_MAX_LEVEL = 50;
const PET_COMPANION_INTIMACY_DECAY_PER_DAY = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function createZeroStats(): PetCompanionStats {
	return {
		DEBUGGING: 0,
		PATIENCE: 0,
		CHAOS: 0,
		WISDOM: 0,
		SNARK: 0,
	};
}

function createZeroUsage(): PetCompanionUsage {
	return {
		mini_chat: 0,
		code_assistant: 0,
		voice_chat: 0,
		companion_panel: 0,
	};
}

function createZeroActivityExp(): PetCompanionActivityExp {
	return {
		mini_chat: 0,
		code_assistant: 0,
		voice_chat: 0,
		companion_panel: 0,
	};
}

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function rng() {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashString(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function pick<T>(rng: () => number, values: readonly T[]): T {
	return values[Math.floor(rng() * values.length)]!;
}

function rollRarity(rng: () => number): PetCompanionRarity {
	const total = Object.values(PET_COMPANION_RARITY_WEIGHTS).reduce(
		(sum, weight) => sum + weight,
		0,
	);
	let roll = rng() * total;
	for (const rarity of PET_COMPANION_RARITIES) {
		roll -= PET_COMPANION_RARITY_WEIGHTS[rarity];
		if (roll < 0) return rarity;
	}
	return "common";
}

function rollStats(
	rng: () => number,
	rarity: PetCompanionRarity,
): PetCompanionStats {
	const floor = PET_COMPANION_RARITY_FLOOR[rarity];
	const peak = pick(rng, PET_COMPANION_STAT_NAMES);
	let dump = pick(rng, PET_COMPANION_STAT_NAMES);
	while (dump === peak) {
		dump = pick(rng, PET_COMPANION_STAT_NAMES);
	}

	const stats = {} as PetCompanionStats;
	for (const statName of PET_COMPANION_STAT_NAMES) {
		if (statName === peak) {
			stats[statName] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
			continue;
		}
		if (statName === dump) {
			stats[statName] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
			continue;
		}
		stats[statName] = floor + Math.floor(rng() * 40);
	}

	return stats;
}

function calculateGrowthStats(
	potentialStats: PetCompanionStats,
	activityExp: PetCompanionActivityExp,
	breakthroughCount: number,
): PetCompanionStats {
	const stats = createZeroStats();

	for (const statName of PET_COMPANION_STAT_NAMES) {
		let experience = 0;
		for (const action of PET_COMPANION_GROWTH_ACTIONS) {
			experience +=
				activityExp[action] * PET_COMPANION_GROWTH_WEIGHTS[action][statName];
		}

		// High-potential traits grow a little faster. Breakthroughs lift the
		// growth multiplier and the soft cap so late-game progress still matters.
		const aptitude = 0.75 + (potentialStats[statName] / 100) * 0.85;
		const breakthroughBoost = 1 + breakthroughCount * 0.18;
		const statCap = Math.min(100, 72 + breakthroughCount * 7);
		const effectiveExperience = experience * aptitude * breakthroughBoost;
		stats[statName] = Math.min(
			100,
			Math.round(statCap * (1 - Math.exp(-effectiveExperience / 85))),
		);
	}

	return stats;
}

function calculateTotalExp(activityExp: PetCompanionActivityExp): number {
	return PET_COMPANION_GROWTH_ACTIONS.reduce(
		(sum, action) => sum + activityExp[action],
		0,
	);
}

function calculateLevelProgress(totalExp: number): {
	level: number;
	levelProgress: number;
	levelExpIntoCurrent: number;
	levelExpRequired: number;
} {
	let remaining = totalExp;
	let level = 1;
	let requirement = 18;

	while (level < PET_COMPANION_MAX_LEVEL && remaining >= requirement) {
		remaining -= requirement;
		level += 1;
		requirement = 18 + (level - 1) * 5;
	}

	return {
		level,
		levelProgress: level >= PET_COMPANION_MAX_LEVEL ? 1 : remaining / requirement,
		levelExpIntoCurrent: remaining,
		levelExpRequired: requirement,
	};
}

function calculateTier(level: number): PetCompanionTier {
	if (level >= 40) return "mythic";
	if (level >= 30) return "master";
	if (level >= 20) return "elite";
	if (level >= 10) return "skilled";
	return "novice";
}

function calculateIntimacy(bondExp: number, lastActiveAt: number, now: number): number {
	const daysInactive = Math.max(0, Math.floor((now - lastActiveAt) / DAY_MS));
	return Math.max(0, Math.min(100, bondExp - daysInactive * PET_COMPANION_INTIMACY_DECAY_PER_DAY));
}

function calculateBreakthroughCount(totalExp: number): number {
	return PET_COMPANION_BREAKTHROUGH_THRESHOLDS.filter(
		(threshold) => totalExp >= threshold,
	).length;
}

export function getPetCompanionProgress(
	companion: StoredPetCompanion,
	now = Date.now(),
): PetCompanionProgress {
	const totalExp = calculateTotalExp(companion.activityExp);
	const levelState = calculateLevelProgress(totalExp);
	const breakthroughCount = calculateBreakthroughCount(totalExp);
	const nextBreakthroughExp =
		PET_COMPANION_BREAKTHROUGH_THRESHOLDS[breakthroughCount] ?? null;
	const previousThreshold =
		breakthroughCount === 0
			? 0
			: PET_COMPANION_BREAKTHROUGH_THRESHOLDS[breakthroughCount - 1]!;
	const breakthroughProgress =
		nextBreakthroughExp === null
			? 1
			: Math.max(
					0,
					Math.min(
						1,
						(totalExp - previousThreshold) /
							(nextBreakthroughExp - previousThreshold),
					),
				);

	return {
		totalExp,
		level: levelState.level,
		levelProgress: levelState.levelProgress,
		levelExpIntoCurrent: levelState.levelExpIntoCurrent,
		levelExpRequired: levelState.levelExpRequired,
		tier: calculateTier(levelState.level),
		intimacy: calculateIntimacy(companion.bondExp, companion.lastActiveAt, now),
		breakthroughCount,
		nextBreakthroughExp,
		breakthroughProgress,
		lastActiveAt: companion.lastActiveAt,
	};
}

export function normalizePetCompanion(
	companion: StoredPetCompanion,
): StoredPetCompanion {
	const normalized = companion as StoredPetCompanion & {
		potentialStats?: PetCompanionStats;
		usage?: PetCompanionUsage;
		activityExp?: PetCompanionActivityExp;
		bondExp?: number;
		updatedAt?: number;
		lastActiveAt?: number;
	};
	const potentialStats = normalized.potentialStats ?? normalized.stats;
	const usage = normalized.usage ?? createZeroUsage();
	const activityExp = normalized.activityExp ?? createZeroActivityExp();
	const totalExp = calculateTotalExp(activityExp);
	const breakthroughCount = calculateBreakthroughCount(totalExp);
	const stats = normalized.potentialStats
		? calculateGrowthStats(potentialStats, activityExp, breakthroughCount)
		: calculateGrowthStats(potentialStats, activityExp, breakthroughCount);

	return {
		...normalized,
		stats,
		potentialStats,
		usage,
		activityExp,
		bondExp: normalized.bondExp ?? 0,
		updatedAt: normalized.updatedAt ?? normalized.createdAt,
		lastActiveAt: normalized.lastActiveAt ?? normalized.createdAt,
	};
}

export function applyPetCompanionGrowth(
	companion: StoredPetCompanion,
	action: PetCompanionGrowthAction,
): StoredPetCompanion {
	const normalized = normalizePetCompanion(companion);
	if (
		PET_COMPANION_ACTION_EXP[action] === 0 &&
		PET_COMPANION_BOND_GAIN[action] === 0
	) {
		return normalized;
	}
	const usage = {
		...normalized.usage,
		[action]: normalized.usage[action] + 1,
	};
	const activityExp = {
		...normalized.activityExp,
		[action]: normalized.activityExp[action] + PET_COMPANION_ACTION_EXP[action],
	};
	const totalExp = calculateTotalExp(activityExp);
	const breakthroughCount = calculateBreakthroughCount(totalExp);
	const now = Date.now();

	return {
		...normalized,
		usage,
		activityExp,
		bondExp: Math.min(
			100,
			normalized.bondExp + PET_COMPANION_BOND_GAIN[action],
		),
		stats: calculateGrowthStats(
			normalized.potentialStats,
			activityExp,
			breakthroughCount,
		),
		updatedAt: now,
		lastActiveAt: now,
	};
}

export function rollPetCompanion(seed: string): StoredPetCompanion {
	const rng = mulberry32(hashString(seed));
	const rarity = rollRarity(rng);
	const potentialStats = rollStats(rng, rarity);
	return {
		seed,
		rarity,
		species: pick(rng, PET_COMPANION_SPECIES),
		eye: pick(rng, PET_COMPANION_EYES),
		hat: rarity === "common" ? "none" : pick(rng, PET_COMPANION_HATS),
		shiny: rng() < 0.01,
		stats: createZeroStats(),
		potentialStats,
		usage: createZeroUsage(),
		activityExp: createZeroActivityExp(),
		bondExp: 0,
		inspirationSeed: Math.floor(rng() * 1e9),
		createdAt: Date.now(),
		updatedAt: Date.now(),
		lastActiveAt: Date.now(),
	};
}
