import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/stores/settings";
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
		en: "Mini Chat",
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
		barClassName: string;
		bgClassName: string;
		borderColor: string;
	}
> = {
	DEBUGGING: {
		zh: "调试力", en: "DEBUGGING", ja: "デバッグ力",
		description: { zh: "帮你找 Bug 的天赋", en: "Natural instinct for finding bugs.", ja: "バグを見つける直感。" },
		imgSrc: IconDebugging,
		barClassName: "bg-[#2dd4bf]", bgClassName: "bg-[#14b8a6]", borderColor: "border-[#14b8a6]",
	},
	PATIENCE: {
		zh: "耐心", en: "PATIENCE", ja: "忍耐力",
		description: { zh: "长对话不崩溃", en: "Stays steady through long sessions.", ja: "長い会話でも安定。" },
		imgSrc: IconPatience,
		barClassName: "bg-[#ef4444]", bgClassName: "bg-[#dc2626]", borderColor: "border-[#dc2626]",
	},
	CHAOS: {
		zh: "混沌", en: "CHAOS", ja: "カオス",
		description: { zh: "创造力和不可预测性", en: "Creative spark and unpredictability.", ja: "創造性と予測不能さ。" },
		imgSrc: IconChaos,
		barClassName: "bg-[#a855f7]", bgClassName: "bg-[#9333ea]", borderColor: "border-[#9333ea]",
	},
	WISDOM: {
		zh: "智慧", en: "WISDOM", ja: "知恵",
		description: { zh: "架构设计直觉", en: "System design intuition.", ja: "設計判断の勘。" },
		imgSrc: IconWisdom,
		barClassName: "bg-[#f59e0b]", bgClassName: "bg-[#d97706]", borderColor: "border-[#d97706]",
	},
	SNARK: {
		zh: "嘴炮", en: "SNARK", ja: "皮肉",
		description: { zh: "吐槽代码的倾向", en: "Likelihood of roasting bad code.", ja: "コードにツッコミを入れる傾向。" },
		imgSrc: IconSnark,
		barClassName: "bg-[#ec4899]", bgClassName: "bg-[#db2777]", borderColor: "border-[#db2777]",
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
}: {
	companion: StoredPetCompanion;
	language: "zh" | "en" | "ja";
}) {
	return (
		<div className="flex flex-col gap-2 w-full max-w-sm mx-auto font-sans justify-center mt-2.5">
			{PET_COMPANION_STAT_NAMES.map((statName) => {
				const value = companion.stats[statName];
				const meta = COMPANION_STAT_META[statName];
				
				return (
					<div key={statName} className="relative w-full">
						{/* Icon bubble on the left */}
						<div className={`absolute -left-1 sm:-left-3 top-0 h-[32px] w-[32px] rounded-full border-[2.5px] border-white z-20 flex items-center justify-center text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${meta.bgClassName} overflow-hidden bg-cover bg-center`}>
							<img src={meta.imgSrc} alt={meta.zh} className="w-full h-full object-cover scale-[1.12]" />
						</div>
						
						{/* Bar Container */}
						<div className="relative ml-[18px] h-[32px] rounded-r-[16px] rounded-l-[20px] bg-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-200 group">
							{/* Fill */}
							<div
								className={`absolute left-0 top-0 bottom-0 rounded-r-[16px] rounded-l-[20px] ${meta.barClassName} border-r-[2px] ${meta.borderColor} transition-all duration-1000 ease-out`}
								style={{ width: `${Math.max(value, 20)}%` }}
							>
								{/* Top highlight for volume */}
								<div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-b from-white/40 to-transparent rounded-t-[16px]" />
							</div>
							
							{/* Value text overlaid */}
							<div className="absolute left-[20px] top-0 bottom-0 flex items-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-10 w-[200px]">
								<span className="font-extrabold text-[12px] tracking-wide">{meta.zh}</span>
								<span className="ml-[6px] text-[10px] text-white/95 scale-90 origin-left font-semibold truncate w-[140px] hidden sm:inline-block drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{meta.description[language]}</span>
							</div>

							<div className="absolute right-3 top-0 bottom-0 flex items-center text-slate-500 font-extrabold italic z-0 text-[13px]">
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
			if (event.key === "clawx-settings") void initSettings();
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
	
	const globalRarityColors = {
		legendary: { 
			bg: "from-orange-500/25 via-rose-500/10 to-transparent", 
			text: "text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
		},
		epic: { 
			bg: "from-fuchsia-500/20 via-purple-500/10 to-transparent", 
			text: "text-transparent bg-clip-text bg-gradient-to-br from-fuchsia-300 via-purple-400 to-purple-600 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]"
		},
		rare: { 
			bg: "from-yellow-400/20 via-amber-300/10 to-transparent", 
			text: "text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-400 to-amber-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
		},
		uncommon: { bg: "", text: "" },
		common: { bg: "", text: "" }
	};

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#f4f7fb] text-slate-800 flex flex-col font-sans select-none border border-slate-200">
			{/* Global Premium Aura & Particles */}
			{isSpecialRarity && currentCompanion && (
				<div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
					<div className={`absolute inset-0 bg-gradient-to-b ${globalRarityColors[currentCompanion.rarity].bg} animate-pulse-slow`} />
					<div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.5)_0%,transparent_50%)] animate-breath mix-blend-overlay" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] flex items-center justify-center mix-blend-overlay opacity-10 blur-sm">
						<img src={IconCrown} className="w-full h-full object-contain animate-rarity-pulse" />
					</div>
				</div>
			)}

			{/* Header (Draggable Region) */}
			<div className={`relative z-20 flex shrink-0 items-center justify-center h-10 shadow-sm [-webkit-app-region:drag] transition-colors duration-1000 ${isSpecialRarity ? 'bg-white/40 backdrop-blur-md border-b border-white/50' : 'bg-white border-b border-slate-200'}`}>
				<h1 className={`text-[15px] flex items-center gap-1.5 font-black tracking-widest transition-all duration-1000 ${isSpecialRarity && currentCompanion ? globalRarityColors[currentCompanion.rarity].text : 'text-[#1e293b] drop-shadow-sm'}`}>
					{copy.title}
					{currentCompanion && (
						<span className={`text-[10px] font-mono font-black relative top-px tracking-normal px-1 rounded transition-colors duration-1000 ${isSpecialRarity ? 'text-white/90 drop-shadow-md bg-black/5' : 'text-slate-300 bg-slate-50'}`}>
							#{String(currentCompanion.inspirationSeed).slice(0, 4)}
						</span>
					)}
				</h1>
				<button
					type="button"
					className={`absolute right-3 top-2 group inline-flex h-6 w-6 items-center justify-center rounded-full transition-all hover:bg-blue-500 hover:text-white [-webkit-app-region:no-drag] ${isSpecialRarity ? 'bg-black/5 text-slate-500' : 'bg-slate-100 text-slate-400'}`}
					onClick={() => {
						void invokeIpc("window:close");
					}}
					aria-label={copy.close}
				>
					<X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 px-4 pb-2 pt-0 z-10 overflow-hidden flex flex-col items-center w-full max-w-sm mx-auto scrollbar-hide">
				{currentCompanion ? (
					<div className="flex h-full w-full flex-col animate-in fade-in zoom-in-95 duration-500">
						{progress ? (
							<div className="mt-2.5 grid grid-cols-2 gap-2.5 px-1">
								<div className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
									<div className="absolute -right-3 -bottom-3 w-14 h-14 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
										<img src={IconLevel} className="w-full h-full object-contain" />
									</div>
									<div className="flex items-center gap-1.5 text-[9.5px] font-black tracking-[0.1em] text-slate-400 relative z-10">
										<img src={IconLevel} className="h-3.5 w-3.5 drop-shadow-sm" />
										<span>{copy.level}</span>
									</div>
									<div className="mt-0.5 text-[20px] font-black text-slate-800 relative z-10 leading-none">
										Lv.{progress.level}
									</div>
									<div className="mt-2 h-1.5 rounded-full bg-slate-100 relative z-10">
										<div
											className="h-full rounded-full bg-sky-500 transition-all duration-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
											style={{ width: `${Math.max(8, progress.levelProgress * 100)}%` }}
										/>
									</div>
									<div className="mt-1 text-[9px] font-bold text-slate-400 relative z-10">
										{progress.levelExpIntoCurrent}/{progress.levelExpRequired} EXP
									</div>
								</div>
								<div 
									className={`rounded-[14px] border bg-white px-2.5 py-2.5 relative overflow-hidden group transition-all duration-500 ${
										currentCompanion.rarity === 'legendary' ? 'border-orange-500 ring-1 ring-orange-500 animate-rarity-pulse z-20' :
										currentCompanion.rarity === 'epic' ? 'border-fuchsia-500 animate-rarity-pulse z-20' :
										currentCompanion.rarity === 'rare' ? 'border-amber-400 animate-rarity-pulse z-20' :
										currentCompanion.rarity === 'uncommon' ? 'border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
										'border-slate-200 shadow-sm hover:border-slate-300'
									}`}
									style={{
										'--rarity-glow': 
											currentCompanion.rarity === 'legendary' ? 'rgba(249,115,22,0.45)' :
											currentCompanion.rarity === 'epic' ? 'rgba(217,70,239,0.4)' :
											currentCompanion.rarity === 'rare' ? 'rgba(251,191,36,0.5)' : 
											'transparent'
									} as React.CSSProperties}
								>
									{/* Rarity BG Tint & Sweep animation */}
									{currentCompanion.rarity !== 'common' && (
										<>
											<div className={`absolute inset-0 z-0 bg-gradient-to-br opacity-20 pointer-events-none ${
												currentCompanion.rarity === 'legendary' ? 'from-orange-400 via-rose-300 to-transparent' :
												currentCompanion.rarity === 'epic' ? 'from-fuchsia-400 via-purple-300 to-transparent' :
												currentCompanion.rarity === 'rare' ? 'from-amber-300 via-yellow-100 to-transparent' :
												'from-emerald-300 via-teal-100 to-transparent'
											}`} />
											
											{/* Holographic foil base for high tier */}
											{['legendary', 'epic'].includes(currentCompanion.rarity) && (
												<div className="absolute inset-0 z-0 bg-foil pointer-events-none" />
											)}

											{['rare', 'epic', 'legendary'].includes(currentCompanion.rarity) && (
												<div className="absolute top-0 left-[-100%] w-[50%] h-[200%] bg-gradient-to-r from-transparent via-white/80 to-transparent -rotate-45 animate-sweep z-10 pointer-events-none" />
											)}
										</>
									)}
									
									<div className="absolute -right-3 -bottom-3 w-14 h-14 opacity-10 pointer-events-none transition-transform group-hover:scale-110 z-0">
										<img src={IconTier} className="w-full h-full object-contain" />
									</div>
									<div className="absolute top-2 right-2 flex items-center gap-1 z-20">
										<img src={IconCrown} className={`w-3.5 h-3.5 object-contain ${currentCompanion.rarity === 'common' ? 'grayscale opacity-60' : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] animate-pulse'}`} />
										{currentCompanion.rarity !== 'common' && (
											<span className={`text-[8.5px] font-black tracking-widest uppercase transform scale-90 origin-right drop-shadow-sm ${
												currentCompanion.rarity === 'legendary' ? 'text-orange-600' :
												currentCompanion.rarity === 'epic' ? 'text-fuchsia-600' :
												currentCompanion.rarity === 'rare' ? 'text-amber-500' :
												'text-emerald-600'
											}`}>
												{rarityLabel}
											</span>
										)}
									</div>
									<div className="flex items-center gap-1.5 text-[9.5px] font-black tracking-[0.1em] text-slate-400 relative z-10">
										<img src={IconTier} className="h-3.5 w-3.5 drop-shadow-sm" />
										<span>{copy.tier}</span>
									</div>
									<div className="mt-0.5 text-[16px] font-black text-slate-800 relative z-10 leading-none">
										{tierLabel}
									</div>
									<div className="mt-2 flex items-center gap-1 text-[9.5px] font-bold text-amber-500 relative z-10 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
										<img src={IconTier} className="h-3 w-3 drop-shadow-sm" />
										<span>{copy.breakthrough} x{progress.breakthroughCount}</span>
									</div>
								</div>
								<div className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-colors">
									<div className="absolute -right-3 -bottom-3 w-14 h-14 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
										<img src={IconIntimacy} className="w-full h-full object-contain" />
									</div>
									<div className="flex items-center gap-1.5 text-[9.5px] font-black tracking-[0.1em] text-slate-400 relative z-10">
										<img src={IconIntimacy} className="h-3.5 w-3.5 drop-shadow-sm" />
										<span>{copy.intimacy}</span>
									</div>
									<div className="mt-0.5 text-[20px] font-black text-slate-800 relative z-10 leading-none">
										{progress.intimacy}
									</div>
									<div className="mt-0.5 text-[9px] font-bold text-slate-400 relative z-10 truncate">
										{formatLastActive(progress.lastActiveAt, language)}
									</div>
									<div className="mt-1 text-[8.5px] font-bold text-slate-300 relative z-10 truncate transform -translate-y-0.5">
										{copy.decayHint}
									</div>
								</div>
								<div className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-colors">
									<div className="absolute -right-3 -bottom-3 w-14 h-14 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
										<img src={IconExp} className="w-full h-full object-contain" />
									</div>
									<div className="flex items-center gap-1.5 text-[9.5px] font-black tracking-[0.1em] text-slate-400 relative z-10">
										<img src={IconExp} className="h-3.5 w-3.5 drop-shadow-sm" />
										<span>{copy.totalExp}</span>
									</div>
									<div className="mt-0.5 text-[20px] font-black text-slate-800 relative z-10 leading-none">
										{progress.totalExp}
									</div>
									<div className="mt-2 h-1.5 rounded-full bg-slate-100 relative z-10">
										<div
											className="h-full rounded-full bg-violet-500 transition-all duration-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
											style={{ width: `${Math.max(8, progress.breakthroughProgress * 100)}%` }}
										/>
									</div>
									<div className="mt-1 text-[9px] font-bold text-slate-400 relative z-10 truncate">
										{progress.nextBreakthroughExp === null
											? `${copy.breakthrough} MAX`
											: `${copy.nextBreakthrough}: ${progress.nextBreakthroughExp}`}
									</div>
								</div>
							</div>
						) : null}

						{/* Stats List */}
						<div className="flex-1 flex flex-col justify-center mt-2 px-1 min-h-0">
							<CompanionStats companion={currentCompanion} language={language} />
						</div>

						<div className="mt-2.5 grid shrink-0 grid-cols-3 gap-2 px-1 pb-1">
							{(["mini_chat", "code_assistant", "voice_chat"] as const).map((action) => {
								const meta = ACTION_META[action];
								const label = meta[language];
								return (
									<div
										key={action}
										className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white px-2 py-2 shadow-sm group hover:border-slate-300 transition-colors"
									>
										<div className="absolute -right-2 -bottom-2 w-12 h-12 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
											<img src={meta.imgSrc} className="w-full h-full object-contain" />
										</div>
										<div className="flex items-center gap-1.5 relative z-10">
											<div className={`flex shrink-0 h-8 w-8 items-center justify-center rounded-[8px] shadow-sm overflow-hidden bg-slate-50 border border-slate-100`}>
												<img src={meta.imgSrc} className="w-full h-full object-cover scale-[1.12]" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="text-[10px] font-black tracking-wide text-slate-700 truncate w-full" title={label}>
													{label}
												</div>
												<div className="text-[8.5px] font-bold text-slate-400 truncate w-full" title={`${currentCompanion.usage[action]} ${copy.actionTimes}`}>
													{currentCompanion.usage[action]} {copy.actionTimes}
												</div>
											</div>
										</div>
										<div className="mt-1.5 text-[9px] font-black text-slate-500 relative z-10 flex items-center justify-between">
											<span className="bg-slate-50 rounded-full px-1.5 py-px border border-slate-100 whitespace-nowrap">+{currentCompanion.activityExp[action]} {copy.actionExp}</span>
										</div>
									</div>
								);
							})}
						</div>

					</div>
				) : (
					<div className="flex h-full flex-col items-center justify-center gap-4 text-blue-400">
						<Zap className="h-8 w-8 animate-pulse text-blue-500" />
						<div className="text-xs font-bold tracking-widest">{copy.loading}</div>
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
