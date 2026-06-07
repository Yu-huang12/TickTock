export type Tier = "Perfect" | "So Close" | "Great" | "Good" | "Close" | "Off";

export function randomTarget(): number {
  const v = 1 + Math.random() * 8.9;
  return Math.round(v * 10) / 10;
}

export function tierFor(diff: number): Tier {
  if (diff < 0.03) return "Perfect";
  if (diff < 0.08) return "So Close";
  if (diff < 0.15) return "Great";
  if (diff < 0.3) return "Good";
  if (diff < 0.6) return "Close";
  return "Off";
}

/** Whether a stop is close enough to celebrate (confetti, success haptic, streak). */
export function celebrates(diff: number): boolean {
  return diff < 0.15; // Perfect, So Close, or Great
}

export function pointsFor(diff: number): number {
  // Continuous score: 1000 for a dead-on stop, falling linearly to 0 at 1.0s off.
  return Math.max(0, Math.round(1000 * (1 - diff)));
}

export const tierStyle: Record<Tier, string> = {
  Perfect: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
  "So Close": "bg-gradient-to-r from-orange-400 to-red-500 text-white",
  Great: "bg-gradient-to-r from-pink-500 to-rose-500 text-white",
  Good: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
  Close: "bg-gradient-to-r from-sky-500 to-indigo-500 text-white",
  Off: "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
};

export const tierEmoji: Record<Tier, string> = {
  Perfect: "🎯",
  "So Close": "🔥",
  Great: "⚡",
  Good: "✨",
  Close: "👍",
  Off: "💨",
};

export const playerColors = [
  { name: "Pink", bg: "from-pink-500 to-rose-500", solid: "bg-pink-500", ring: "ring-pink-500", text: "text-pink-300" },
  { name: "Cyan", bg: "from-cyan-500 to-blue-500", solid: "bg-cyan-500", ring: "ring-cyan-500", text: "text-cyan-300" },
  { name: "Amber", bg: "from-yellow-400 to-amber-500", solid: "bg-amber-500", ring: "ring-amber-500", text: "text-amber-300" },
  { name: "Violet", bg: "from-violet-500 to-purple-500", solid: "bg-violet-500", ring: "ring-violet-500", text: "text-violet-300" },
  { name: "Emerald", bg: "from-emerald-400 to-teal-500", solid: "bg-emerald-500", ring: "ring-emerald-500", text: "text-emerald-300" },
  { name: "Orange", bg: "from-orange-400 to-red-500", solid: "bg-orange-500", ring: "ring-orange-500", text: "text-orange-300" },
];

// ── Drinking game mode ──────────────────────────────────────────────────────
// An optional party rule: the player furthest from the target drinks. Shots can
// be swapped for water or a dare — keep it friendly and 21+.

/** Short reminder shown wherever the drinking toggle appears. */
export const DRINK_NOTE =
  "Party rule for 21+. Please drink responsibly — swap shots for water or a dare anytime.";

/**
 * Given player ids with their diffs for a round, return the id(s) furthest from
 * the target (largest diff). Returns all ids on a tie. Empty input → [].
 */
export function furthestPlayers(entries: { id: string; diff: number }[]): string[] {
  if (entries.length === 0) return [];
  const maxDiff = Math.max(...entries.map((e) => e.diff));
  return entries.filter((e) => e.diff >= maxDiff - 1e-9).map((e) => e.id);
}

