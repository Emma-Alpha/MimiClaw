import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings";
import { useStyles } from "./PetCompanion.styles";
import {
	Code2,
	Mic,
	MessagesSquare,
	X,
	Zap,
} from "lucide-react";
import { invokeIpc } from "@/lib/api-client";
import IconDebugging from "@/assets/stats/icon_debugging.png";
import IconPatience from "@/assets/stats/icon_patience.png";
import IconChaos from "@/assets/stats/icon_chaos.png";
import IconWisdom from "@/assets/stats/icon_wisdom.png";
import IconSnark from "@/assets/stats/icon_snark.png";
import IconCrown from "@/assets/stats/icon_crown.png";
import IconLevel from "@/assets/stats/icon_level.png";
import IconTier from "@/assets/stats/icon_tier.png";
import IconIntimacy from "@/assets/stats/icon_intimacy.png";
import IconExp from "@/assets/stats/icon_exp.png";
import IconChat from "@/assets/stats/icon_chat.png";
import IconCode from "@/assets/stats/icon_code.png";
import IconVoice from "@/assets/stats/icon_voice.png";
import {
	getPetCompanionProgress,
	normalizePetCompanion,
	PET_COMPANION_STAT_NAMES,
	rollPetCompanion,
	type PetCompanionRarity,
	type PetCompanionTier,
	type StoredPetCompanion,
} from "../../shared/pet-companion";

const COMPANION_RARITY_LABELS: Record<
	PetCompanionRarity,
	{ zh: string; en: string; ja: string }
> = {
	common: { zh: "普通", en: "Common", ja: "ノーマル" },
	uncommon: { zh: "少见", en: "Uncommon", ja: "アンコモン" },
	rare: { zh: "稀有", en: "Rare", ja: "レア" },
	epic: { zh: "史诗", en: "Epic", ja: "エピック" },
	legendary: { zh: "传说", en: "Legendary", ja: "レジェンダリー" },
};

const COMPANION_TIER_LABELS: Record<
	PetCompanionTier,
	{ zh: string; en: string; ja: string }
> = {
	novice: { zh: "新手期", en: "Novice", ja: "ルーキー" },
	skilled: { zh: "熟练期", en: "Skilled", ja: "熟練" },
	elite: { zh: "精英期", en: "Elite", ja: "エリート" },
	master: { zh: "大师期", en: "Master", ja: "マスター" },
	mythic: { zh: "传说期", en: "Mythic", ja: "ミシック" },
};

const ACTION_META = {
	mini_chat: {
		icon: MessagesSquare,
		imgSrc: IconChat,
		zh: "迷你对话",
		en: "Code Chat",
		ja: "ミニチャット",
		bgClassName: "bg-sky-500",
	},
	code_assistant: {
		icon: Code2,
		imgSrc: IconCode,
		zh: "代码助手",
		en: "Code",
		ja: "コード",
		bgClassName: "bg-emerald-500",
	},
	voice_chat: {
		icon: Mic,
		imgSrc: IconVoice,
		zh: "语音对话",
		en: "Voice",
		ja: "音声",
		bgClassName: "bg-fuchsia-500",
	},
} as const;

const COMPANION_STAT_META: Record<
	(typeof PET_COMPANION_STAT_NAMES)[number],
	{
		zh: string;
		en: string;
		ja: string;
		description: { zh: string; en: string; ja: string };
		imgSrc: string;
		barColor: string;
		bgColor: string;
		borderColor: string;
	}
> = {
	DEBUGGING: {
		zh: "调试力", en: "DEBUGGING", ja: "デバッグ力",
		description: { zh: "帮你找 Bug 的天赋", en: "Natural instinct for finding bugs.", ja: "バグを見つける直感。" },
		imgSrc: IconDebugging,
		barColor: "#2dd4bf", bgColor: "#14b8a6", borderColor: "#14b8a6",
	},
	PATIENCE: {
		zh: "耐心", en: "PATIENCE", ja: "忍耐力",
		description: { zh: "长对话不崩溃", en: "Stays steady through long sessions.", ja: "長い会話でも安定。" },
		imgSrc: IconPatience,
		barColor: "#ef4444", bgColor: "#dc2626", borderColor: "#dc2626",
	},
	CHAOS: {
		zh: "混沌", en: "CHAOS", ja: "カオス",
		description: { zh: "创造力和不可预测性", en: "Creative spark and unpredictability.", ja: "創造性と予測不能さ。" },
		imgSrc: IconChaos,
		barColor: "#a855f7", bgColor: "#9333ea", borderColor: "#9333ea",
	},
	WISDOM: {
		zh: "智慧", en: "WISDOM", ja: "知恵",
		description: { zh: "架构设计直觉", en: "System design intuition.", ja: "設計判断の勘。" },
		imgSrc: IconWisdom,
		barColor: "#f59e0b", bgColor: "#d97706", borderColor: "#d97706",
	},
	SNARK: {
		zh: "嘴炮", en: "SNARK", ja: "皮肉",
		description: { zh: "吐槽代码的倾向", en: "Likelihood of roasting bad code.", ja: "コードにツッコミを入れる傾向。" },
		imgSrc: IconSnark,
		barColor: "#ec4899", bgColor: "#db2777", borderColor: "#db2777",
	},
};

function resolveCompanionLocale(language: string | undefined): "zh" | "en" | "ja" {
	if (language?.startsWith("ja")) return "ja";
	if (language?.startsWith("zh")) return "zh";
	return "en";
}

function companionPageText(language: "zh" | "en" | "ja") {
	return {
		title:
			language === "zh"
				? "小黑猫属性"
				: language === "ja"
					? "クロネコ属性"
					: "Cat Attributes",
		subtitle:
			language === "zh"
				? "属性从 0 开始，会随着聊天、语音和代码助手使用慢慢成长"
				: language === "ja"
					? "属性は 0 から始まり、チャットや音声、コード利用で少しずつ育ちます"
					: "Stats start from 0 and grow through chat, voice, and coding use.",
		rarity:
			language === "zh" ? "稀有度" : language === "ja" ? "レア度" : "Rarity",
		gear:
			language === "zh" ? "装备" : language === "ja" ? "装備" : "Gear",
		eye:
			language === "zh" ? "眼睛" : language === "ja" ? "目" : "Eye",
		archetype:
			language === "zh" ? "灵感原型" : language === "ja" ? "元ネタ" : "Archetype",
		shiny:
			language === "zh" ? "闪光体质" : language === "ja" ? "色違い体質" : "Shiny",
		shinyYes:
			language === "zh" ? "已觉醒" : language === "ja" ? "覚醒済み" : "Awakened",
		shinyNo:
			language === "zh" ? "普通体质" : language === "ja" ? "通常" : "Standard",
		localOnly:
			language === "zh" ? "本地持久化" : language === "ja" ? "ローカル保存" : "Local Persisted",
		seed:
			language === "zh" ? "种子" : language === "ja" ? "シード" : "Seed",
		level:
			language === "zh" ? "等级" : language === "ja" ? "レベル" : "Level",
		tier:
			language === "zh" ? "段位" : language === "ja" ? "段階" : "Tier",
		intimacy:
			language === "zh" ? "亲密度" : language === "ja" ? "親密度" : "Intimacy",
		breakthrough:
			language === "zh" ? "突破" : language === "ja" ? "突破" : "Breakthrough",
		totalExp:
			language === "zh" ? "总经验" : language === "ja" ? "総経験値" : "Total EXP",
		nextBreakthrough:
			language === "zh" ? "下一次突破" : language === "ja" ? "次の突破" : "Next Breakthrough",
		actionTimes:
			language === "zh" ? "次使用" : language === "ja" ? "回利用" : "uses",
		actionExp:
			language === "zh" ? "经验" : language === "ja" ? "経験" : "EXP",
		decayHint:
			language === "zh"
				? "若长期不互动，亲密度每天衰减 4 点"
				: language === "ja"
					? "しばらく触れないと親密度が毎日 4 ずつ減少します"
					: "Intimacy decays by 4 per inactive day.",
		close:
			language === "zh" ? "关闭" : language === "ja" ? "閉じる" : "Close",
		loading:
			language === "zh"
				? "正在生成属性..."
				: language === "ja"
					? "属性を生成しています..."
					: "Generating attributes...",
	};
}

function formatLastActive(
	lastActiveAt: number,
	language: "zh" | "en" | "ja",
): string {
	const days = Math.max(
		0,
		Math.floor((Date.now() - lastActiveAt) / (24 * 60 * 60 * 1000)),
	);
	if (language === "zh") {
		return days === 0 ? "今天活跃" : `${days} 天未互动`;
	}
	if (language === "ja") {
		return days === 0 ? "今日アクティブ" : `${days}日未接触`;
	}
	return days === 0 ? "Active today" : `Idle for ${days} day${days > 1 ? "s" : ""}`;
}

function CompanionStats({
	companion,
	language,
	styles,
}: {
	companion: StoredPetCompanion;
	language: "zh" | "en" | "ja";
	styles: Record<string, string>;
}) {
	return (
		<div className={styles.statsList}>
			{PET_COMPANION_STAT_NAMES.map((statName) => {
				const value = companion.stats[statName];
				const meta = COMPANION_STAT_META[statName];

				return (
					<div key={statName} className={styles.statRow}>
						{/* Icon bubble on the left */}
						<div className={styles.statIconBubble} style={{ background: meta.bgColor }}>
							<img src={meta.imgSrc} alt={meta.zh} className={styles.statIconImg} />
						</div>

						{/* Bar Container */}
						<div className={styles.statBarContainer}>
							{/* Fill */}
							<div
								className={styles.statBarFill}
								style={{ width: `${Math.max(value, 20)}%`, backgroundColor: meta.barColor, borderColor: meta.borderColor }}
							>
								{/* Top highlight for volume */}
								<div className={styles.statBarHighlight} />
							</div>

							{/* Value text overlaid */}
							<div className={styles.statLabel}>
								<span className={styles.statName}>{meta.zh}</span>
								<span className={styles.statDesc}>{meta.description[language]}</span>
							</div>

							<div className={styles.statValue}>
								{value}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export function PetCompanion() {
	const { styles } = useStyles();
	const { i18n } = useTranslation("settings");
	const initSettings = useSettingsStore((state) => state.init);
	const petCompanion = useSettingsStore((state) => state.petCompanion);
	const petCompanionSeed = useSettingsStore((state) => state.petCompanionSeed);
	const machineId = useSettingsStore((state) => state.machineId);
	const setPetCompanion = useSettingsStore((state) => state.setPetCompanion);
	const [settingsReady, setSettingsReady] = useState(false);

	const language = useMemo(
		() => resolveCompanionLocale(i18n.resolvedLanguage || i18n.language),
		[i18n.language, i18n.resolvedLanguage],
	);
	const copy = companionPageText(language);

	useEffect(() => {
		void initSettings().finally(() => {
			setSettingsReady(true);
		});
	}, [initSettings]);

	useEffect(() => {
		const syncFromStorage = (event: StorageEvent) => {
			if (event.key === "mimiclaw-settings") void initSettings();
		};
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:settings-updated",
			() => {
				void initSettings();
			},
		);
		window.addEventListener("storage", syncFromStorage);
		return () => {
			unsubscribe?.();
			window.removeEventListener("storage", syncFromStorage);
		};
	}, [initSettings]);

	useEffect(() => {
		if (!settingsReady) return;
		void invokeIpc("pet:syncCompanionProgress").catch(() => {});
	}, [settingsReady]);

	useEffect(() => {
		if (!settingsReady || petCompanion) return;

		const seed =
			petCompanionSeed.trim() ||
			(machineId.trim()
				? `machine:${machineId.trim()}`
				: `local:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`);

		setPetCompanion(rollPetCompanion(seed), seed);
	}, [
		machineId,
		petCompanion,
		petCompanionSeed,
		setPetCompanion,
		settingsReady,
	]);

	useEffect(() => {
		if (!settingsReady || !petCompanion) return;

		const normalized = normalizePetCompanion(petCompanion);
		if (
			!("potentialStats" in petCompanion) ||
			!("usage" in petCompanion) ||
			!("activityExp" in petCompanion) ||
			!("bondExp" in petCompanion) ||
			!("updatedAt" in petCompanion) ||
			!("lastActiveAt" in petCompanion)
		) {
			setPetCompanion(normalized, normalized.seed);
		}
	}, [petCompanion, setPetCompanion, settingsReady]);

	const currentCompanion = petCompanion;
	const progress = currentCompanion
		? getPetCompanionProgress(currentCompanion)
		: null;
	const rarityLabel = currentCompanion
		? COMPANION_RARITY_LABELS[currentCompanion.rarity][language]
		: "";
	const tierLabel = progress
		? COMPANION_TIER_LABELS[progress.tier][language]
		: "";

	const isSpecialRarity = currentCompanion && ['rare', 'epic', 'legendary'].includes(currentCompanion.rarity);
	

	return (
		<div className={styles.root}>
			{/* Global Premium Aura & Particles */}
			{isSpecialRarity && currentCompanion && (
				<div className={styles.auraLayer}>
					<div
						className="animate-pulse-slow"
						style={{
							position: 'absolute', inset: 0,
							background: `linear-gradient(to bottom, ${
								currentCompanion.rarity === 'legendary' ? 'rgba(249,115,22,0.25), rgba(244,63,94,0.1), transparent' :
								currentCompanion.rarity === 'epic' ? 'rgba(217,70,239,0.2), rgba(168,85,247,0.1), transparent' :
								'rgba(251,191,36,0.2), rgba(251,146,60,0.1), transparent'
							})`,
						}}
					/>
					<div
						className="animate-breath"
						style={{
							position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
							background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 50%)',
							mixBlendMode: 'overlay',
						}}
					/>
					<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '140vw', height: '140vw', display: 'flex', alignItems: 'center', justifyContent: 'center', mixBlendMode: 'overlay', opacity: 0.1, filter: 'blur(4px)' }}>
						<img src={IconCrown} className="animate-rarity-pulse" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
					</div>
				</div>
			)}

			{/* Header (Draggable Region) */}
			<div
				className={isSpecialRarity ? styles.headerBarSpecial : styles.headerBarNormal}
				style={{ position: 'relative', zIndex: 20, display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', height: 40, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', WebkitAppRegion: 'drag', transition: 'background 1s, border-color 1s' } as React.CSSProperties}
			>
				<h1 className={styles.headerTitle} style={isSpecialRarity && currentCompanion ? { background: 'linear-gradient(135deg, #fef08a, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: '#1e293b' }}>
					{copy.title}
					{currentCompanion && (
						<span className={isSpecialRarity ? styles.seedLabelSpecial : styles.seedLabelNormal}>
							#{String(currentCompanion.inspirationSeed).slice(0, 4)}
						</span>
					)}
				</h1>
				<button
					type="button"
					className={isSpecialRarity ? styles.closeBtnSpecial : styles.closeBtnNormal}
					style={{ position: 'absolute', right: 12, top: 8, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
					onClick={() => {
						void invokeIpc("window:close");
					}}
					aria-label={copy.close}
				>
					<X style={{ width: 14, height: 14 }} />
				</button>
			</div>

			{/* Content */}
			<div className={styles.content} style={{ overflowY: 'auto' }}>
				{currentCompanion ? (
					<div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column' }}>
						{progress ? (
							<div className={styles.cardGrid}>
								{/* Level Card */}
								<div style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
									<div style={{ position: 'absolute', right: -12, bottom: -12, width: 56, height: 56, opacity: 0.1, pointerEvents: 'none' }}>
										<img src={IconLevel} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.1em', color: '#94a3b8', position: 'relative', zIndex: 10 }}>
										<img src={IconLevel} style={{ height: 14, width: 14 }} />
										<span>{copy.level}</span>
									</div>
									<div style={{ marginTop: 2, fontSize: 14, fontWeight: 900, color: '#1e293b', lineHeight: 1, position: 'relative', zIndex: 10 }}>
										Lv.{progress.level}
									</div>
									<div style={{ marginTop: 8, height: 6, borderRadius: 9999, background: '#f1f5f9', position: 'relative', zIndex: 10 }}>
										<div style={{ height: '100%', borderRadius: 9999, background: '#0ea5e9', transition: 'width 0.7s', width: `${Math.max(8, progress.levelProgress * 100)}%` }} />
									</div>
									<div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: '#94a3b8', position: 'relative', zIndex: 10 }}>
										{progress.levelExpIntoCurrent}/{progress.levelExpRequired} EXP
									</div>
								</div>

								{/* Tier/Rarity Card */}
								<div
									className={['rare', 'epic', 'legendary'].includes(currentCompanion.rarity) ? 'animate-rarity-pulse' : ''}
									style={{
										borderRadius: 14,
										border: `1px solid ${currentCompanion.rarity === 'legendary' ? '#f97316' : currentCompanion.rarity === 'epic' ? '#d946ef' : currentCompanion.rarity === 'rare' ? '#fbbf24' : currentCompanion.rarity === 'uncommon' ? '#34d399' : '#e2e8f0'}`,
										background: '#fff',
										padding: '10px',
										position: 'relative',
										overflow: 'hidden',
										transition: 'all 0.5s',
										zIndex: ['legendary', 'epic', 'rare'].includes(currentCompanion.rarity) ? 20 : 'auto',
										'--rarity-glow': currentCompanion.rarity === 'legendary' ? 'rgba(249,115,22,0.45)' : currentCompanion.rarity === 'epic' ? 'rgba(217,70,239,0.4)' : currentCompanion.rarity === 'rare' ? 'rgba(251,191,36,0.5)' : 'transparent',
									} as React.CSSProperties}
								>
									{currentCompanion.rarity !== 'common' && (
										<>
											<div style={{
												position: 'absolute', inset: 0, zIndex: 0, opacity: 0.2, pointerEvents: 'none',
												background: `linear-gradient(135deg, ${
													currentCompanion.rarity === 'legendary' ? '#fb923c, #fda4af, transparent' :
													currentCompanion.rarity === 'epic' ? '#e879f9, #c084fc, transparent' :
													currentCompanion.rarity === 'rare' ? '#fcd34d, #fef08a, transparent' :
													'#6ee7b7, #99f6e4, transparent'
												})`,
											}} />
											{['legendary', 'epic'].includes(currentCompanion.rarity) && (
												<div className="bg-foil" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
											)}
											{['rare', 'epic', 'legendary'].includes(currentCompanion.rarity) && (
												<div className="animate-sweep" style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '200%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)', transform: 'rotate(-45deg)', zIndex: 10, pointerEvents: 'none' }} />
											)}
										</>
									)}
									<div style={{ position: 'absolute', right: -12, bottom: -12, width: 56, height: 56, opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}>
										<img src={IconTier} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
									</div>
									<div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 20 }}>
										<img src={IconCrown} className={currentCompanion.rarity !== 'common' ? 'animate-pulse' : ''} style={{ width: 14, height: 14, objectFit: 'contain', opacity: currentCompanion.rarity === 'common' ? 0.6 : 1 }} />
										{currentCompanion.rarity !== 'common' && (
											<span style={{
												fontSize: '8.5px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
												color: currentCompanion.rarity === 'legendary' ? '#ea580c' : currentCompanion.rarity === 'epic' ? '#c026d3' : currentCompanion.rarity === 'rare' ? '#f59e0b' : '#059669',
											}}>
												{rarityLabel}
											</span>
										)}
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.1em', color: '#94a3b8', position: 'relative', zIndex: 10 }}>
										<img src={IconTier} style={{ height: 14, width: 14 }} />
										<span>{copy.tier}</span>
									</div>
									<div style={{ marginTop: 2, fontSize: 14, fontWeight: 900, color: '#1e293b', lineHeight: 1, position: 'relative', zIndex: 10 }}>
										{tierLabel}
									</div>
									<div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: '9.5px', fontWeight: 700, color: '#f59e0b', position: 'relative', zIndex: 10, background: '#fffbeb', padding: '2px 8px', borderRadius: 9999, width: 'fit-content' }}>
										<img src={IconTier} style={{ height: 12, width: 12 }} />
										<span>{copy.breakthrough} x{progress.breakthroughCount}</span>
									</div>
								</div>

								{/* Intimacy Card */}
								<div style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
									<div style={{ position: 'absolute', right: -12, bottom: -12, width: 56, height: 56, opacity: 0.1, pointerEvents: 'none' }}>
										<img src={IconIntimacy} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.1em', color: '#94a3b8', position: 'relative', zIndex: 10 }}>
										<img src={IconIntimacy} style={{ height: 14, width: 14 }} />
										<span>{copy.intimacy}</span>
									</div>
									<div style={{ marginTop: 2, fontSize: 14, fontWeight: 900, color: '#1e293b', lineHeight: 1, position: 'relative', zIndex: 10 }}>
										{progress.intimacy}
									</div>
									<div style={{ marginTop: 2, fontSize: 9, fontWeight: 700, color: '#94a3b8', position: 'relative', zIndex: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{formatLastActive(progress.lastActiveAt, language)}
									</div>
									<div style={{ marginTop: 4, fontSize: '8.5px', fontWeight: 700, color: '#cbd5e1', position: 'relative', zIndex: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{copy.decayHint}
									</div>
								</div>

								{/* EXP Card */}
								<div style={{ borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
									<div style={{ position: 'absolute', right: -12, bottom: -12, width: 56, height: 56, opacity: 0.1, pointerEvents: 'none' }}>
										<img src={IconExp} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.1em', color: '#94a3b8', position: 'relative', zIndex: 10 }}>
										<img src={IconExp} style={{ height: 14, width: 14 }} />
										<span>{copy.totalExp}</span>
									</div>
									<div style={{ marginTop: 2, fontSize: 14, fontWeight: 900, color: '#1e293b', lineHeight: 1, position: 'relative', zIndex: 10 }}>
										{progress.totalExp}
									</div>
									<div style={{ marginTop: 8, height: 6, borderRadius: 9999, background: '#f1f5f9', position: 'relative', zIndex: 10 }}>
										<div style={{ height: '100%', borderRadius: 9999, background: '#8b5cf6', transition: 'width 0.7s', width: `${Math.max(8, progress.breakthroughProgress * 100)}%` }} />
									</div>
									<div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: '#94a3b8', position: 'relative', zIndex: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{progress.nextBreakthroughExp === null
											? `${copy.breakthrough} MAX`
											: `${copy.nextBreakthrough}: ${progress.nextBreakthroughExp}`}
									</div>
								</div>
							</div>
						) : null}

						{/* Stats List */}
						<div className={styles.statsWrap}>
							<CompanionStats companion={currentCompanion} language={language} styles={styles} />
						</div>

						<div className={styles.actionGrid}>
							{(["mini_chat", "code_assistant", "voice_chat"] as const).map((action) => {
								const meta = ACTION_META[action];
								const label = meta[language];
								return (
									<div
										key={action}
										style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', padding: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' }}
									>
										<div style={{ position: 'absolute', right: -8, bottom: -8, width: 48, height: 48, opacity: 0.1, pointerEvents: 'none' }}>
											<img src={meta.imgSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 10 }}>
											<div style={{ display: 'flex', flexShrink: 0, height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
												<img src={meta.imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.12)' }} />
											</div>
											<div style={{ minWidth: 0, flex: 1 }}>
												<div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.05em', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={label}>
													{label}
												</div>
												<div style={{ fontSize: '8.5px', fontWeight: 700, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={`${currentCompanion.usage[action]} ${copy.actionTimes}`}>
													{currentCompanion.usage[action]} {copy.actionTimes}
												</div>
											</div>
										</div>
										<div style={{ marginTop: 6, fontSize: 9, fontWeight: 900, color: '#64748b', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
											<span style={{ background: '#f8fafc', borderRadius: 9999, padding: '1px 6px', border: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>+{currentCompanion.activityExp[action]} {copy.actionExp}</span>
										</div>
									</div>
								);
							})}
						</div>

					</div>
				) : (
					<div className={styles.loadingWrap}>
						<Zap style={{ width: 32, height: 32, color: '#3b82f6' }} className="animate-pulse" />
						<div className={styles.loadingText}>{copy.loading}</div>
					</div>
				)}
			</div>
			
			<style>{`
				@keyframes sweep {
					0% { transform: translateX(-150%) rotate(35deg); }
					30% { transform: translateX(350%) rotate(35deg); }
					100% { transform: translateX(350%) rotate(35deg); }
				}
				.animate-sweep {
					animation: sweep 6s infinite linear;
				}
				@keyframes rarity-pulse {
					0%, 100% { box-shadow: 0 0 10px var(--rarity-glow); transform: scale(1); }
					50% { box-shadow: 0 0 24px var(--rarity-glow); transform: scale(1.02); }
				}
				.animate-rarity-pulse {
					animation: rarity-pulse 2s ease-in-out infinite;
				}
				@keyframes foil-shift {
					0% { background-position: 0% 50%; }
					50% { background-position: 100% 50%; }
					100% { background-position: 0% 50%; }
				}
				.bg-foil {
					background-image: linear-gradient(60deg, rgba(255,220,100,0.5) 0%, rgba(255,100,200,0.4) 25%, rgba(100,200,255,0.5) 50%, rgba(255,220,100,0.5) 75%, rgba(255,100,200,0.4) 100%);
					background-size: 300% 300%;
					animation: foil-shift 5s ease-in-out infinite;
					mix-blend-mode: color-dodge;
				}
				@keyframes breath {
					0%, 100% { opacity: 0.3; transform: scale(1); }
					50% { opacity: 0.7; transform: scale(1.05); }
				}
				.animate-breath {
					animation: breath 5s ease-in-out infinite;
				}
				@keyframes pulse-slow {
					0%, 100% { opacity: 0.6; }
					50% { opacity: 1; }
				}
				.animate-pulse-slow {
					animation: pulse-slow 4s ease-in-out infinite;
				}
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
			`}</style>
		</div>
	);
}
