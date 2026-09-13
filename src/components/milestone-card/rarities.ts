export type CardRarity = "bronze" | "silver" | "gold" | "platinum";

// The only thing that differs between rarities: the title font color
// and the small graphic mark's color. Card background, border, and
// everything else are identical across all rarities. Chosen to read
// clearly against the app's actual light theme (surface #FFFFFF,
// ink #18181B, hairline #ECECEC — see tailwind.config).
export const rarityAccentColor: Record<CardRarity, string> = {
  bronze: "#A9633A",
  silver: "#5B6472",
  gold: "#A6820B",
  platinum: "#4B6472",
};

export const rarityLabel: Record<CardRarity, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Session-count thresholds -> rarity tier, used to derive a milestone's rarity from its `value`. */
export function rarityForSessionCount(value: number): CardRarity {
  if (value >= 150) return "platinum";
  if (value >= 100) return "gold";
  if (value >= 50) return "silver";
  return "bronze";
}
