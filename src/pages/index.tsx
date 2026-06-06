import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "@/components/Confetti";
import {
  Play,
  Square,
  Sparkles,
  Trophy,
  RotateCcw,
  Flame,
  Award,
  Zap,
  Crosshair,
  History,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  randomTarget,
  tierFor,
  pointsFor,
  tierStyle,
  tierEmoji,
  type Tier,
} from "@/lib/game-utils";
import { hapticTap, hapticResult, keepAwake, allowSleep } from "@/lib/native";

type Phase = "idle" | "running" | "result";

interface RoundRecord {
  n: number;
  target: number;
  elapsed: number;
  diff: number;
  tier: Tier;
  points: number;
}

const HISTORY_KEY = "ticktock.solo.history";

/** Load saved Solo history from local storage, tolerating missing/corrupt data. */
function loadHistory(): RoundRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoundRecord[]) : [];
  } catch {
    return [];
  }
}

const tierBar: Record<Tier, string> = {
  Perfect: "from-yellow-400 to-amber-500",
  Great: "from-pink-500 to-rose-500",
  Good: "from-cyan-500 to-blue-500",
  Off: "from-violet-500 to-purple-600",
};

export default function HomePage() {
  const [target, setTarget] = useState(() => randomTarget());
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RoundRecord | null>(null);
  const [history, setHistory] = useState<RoundRecord[]>(loadHistory);
  const startRef = useRef(0);

  // Persist Solo history so stats survive reloads and app restarts.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [history]);

  const score = useMemo(() => history.reduce((a, r) => a + r.points, 0), [history]);
  const avgOff = useMemo(
    () => (history.length ? history.reduce((a, r) => a + r.diff, 0) / history.length : null),
    [history]
  );
  const best = useMemo(
    () => (history.length ? history.reduce((b, r) => (r.diff < b.diff ? r : b)) : null),
    [history]
  );
  const streak = useMemo(() => {
    let s = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].tier === "Perfect" || history[i].tier === "Great") s++;
      else break;
    }
    return s;
  }, [history]);
  const recent = useMemo(() => [...history].reverse().slice(0, 5), [history]);

  const start = () => {
    setPhase("running");
    startRef.current = performance.now();
    void hapticTap();
    void keepAwake();
  };

  const stop = () => {
    const elapsed = (performance.now() - startRef.current) / 1000;
    const diff = Math.abs(elapsed - target);
    const record: RoundRecord = {
      n: history.length + 1,
      target,
      elapsed,
      diff,
      tier: tierFor(diff),
      points: pointsFor(diff),
    };
    setHistory((h) => [...h, record]);
    setResult(record);
    setPhase("result");
    void hapticResult(record.tier === "Perfect" || record.tier === "Great");
    void allowSleep();
  };

  const next = () => {
    setTarget(randomTarget());
    setResult(null);
    setPhase("idle");
  };

  const reset = () => {
    setHistory([]);
    setResult(null);
    setPhase("idle");
    setTarget(randomTarget());
  };

  // Spacebar acts as start / stop / next.
  const actionRef = useRef<() => void>(() => {});
  actionRef.current = phase === "idle" ? start : phase === "running" ? stop : next;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      e.preventDefault();
      actionRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const celebrate = result && (result.tier === "Perfect" || result.tier === "Great");

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/multiplayer"
        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur transition-colors active:bg-card/60"
      >
        <span className="text-sm">
          <span className="font-semibold">Solo mode</span>{" "}
          <span className="text-muted-foreground">· play with friends?</span>
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
          <Users className="size-4" /> Multiplayer
        </span>
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="app-card relative overflow-hidden p-0 lg:col-span-2">
          {celebrate && <Confetti />}
          <div className="flex flex-col items-center gap-6 px-6 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <Crosshair className="size-3.5" /> Your target
              </p>
              <p className="text-7xl font-black leading-none tabular-nums">
                <span className="bg-gradient-to-br from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  {target.toFixed(1)}
                </span>
                <span className="ml-1 text-3xl font-bold text-cyan-300/70">s</span>
              </p>
            </div>

            {phase === "idle" && (
              <button
                onClick={start}
                className="flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_0_55px_-8px_rgba(236,72,153,0.6)] transition-transform active:scale-95"
              >
                <Play className="size-9 fill-current" />
                <span className="mt-1 text-lg font-bold tracking-wide">START</span>
              </button>
            )}

            {phase === "running" && (
              <button
                onClick={stop}
                className="pulse-ring flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-2xl transition-transform active:scale-95"
              >
                <Square className="size-8 fill-current" />
                <span className="mt-1 text-lg font-bold tracking-wide">STOP</span>
              </button>
            )}

            {phase === "result" && (
              <button
                onClick={next}
                className="glow-pop flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_0_70px_-5px_rgba(168,85,247,0.7)] transition-transform active:scale-95"
              >
                <Sparkles className="size-8" />
                <span className="mt-1 text-lg font-bold tracking-wide">NEXT</span>
              </button>
            )}

            {phase === "result" && result && (
              <>
                <div className="flex items-center gap-2">
                  <Badge className={`px-3 py-1 text-sm ${tierStyle[result.tier]}`}>
                    {tierEmoji[result.tier]} {result.tier}
                  </Badge>
                  <span className="text-xl font-bold text-accent">
                    +{result.points.toLocaleString()}
                  </span>
                </div>
                <div className="grid w-full max-w-sm grid-cols-3 gap-3">
                  <MiniStat label="Target" value={`${target.toFixed(1)}s`} />
                  <MiniStat label="You" value={`${result.elapsed.toFixed(2)}s`} />
                  <MiniStat label="Off by" value={`${result.diff.toFixed(2)}s`} />
                </div>
              </>
            )}

            {phase !== "result" && (
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                Press <span className="font-semibold text-foreground">Start</span>, count in your
                head, then stop as close to the target as you can.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              or press{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                Space
              </kbd>
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="app-card gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <Trophy className="size-4 text-accent" /> Your stats
              </h2>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={Award} label="Total" value={score.toLocaleString()} tint="amber" />
              <StatTile icon={Flame} label="Streak" value={String(streak)} tint="pink" />
              <StatTile icon={Zap} label="Rounds" value={String(history.length)} tint="cyan" />
              <StatTile
                icon={Crosshair}
                label="Avg Off"
                value={avgOff !== null ? `${avgOff.toFixed(2)}s` : "—"}
                tint="violet"
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Best round
              </p>
              {best ? (
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="font-semibold tabular-nums">
                    {best.target.toFixed(1)}s → {best.elapsed.toFixed(2)}s
                  </span>
                  <span className="font-bold text-accent">{best.points.toLocaleString()}</span>
                </div>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">No rounds yet</p>
              )}
            </div>
          </Card>

          <Card className="app-card gap-3 p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <History className="size-4 text-secondary" /> Recent rounds
            </h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rounds yet — hit Start!</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map((r) => {
                  const accuracy = Math.max(0, Math.min(1, 1 - r.diff / r.target));
                  return (
                    <div
                      key={r.n}
                      className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={`px-2 py-0.5 text-[11px] ${tierStyle[r.tier]}`}>
                          {tierEmoji[r.tier]} {r.tier}
                        </Badge>
                        <span className="text-sm font-medium tabular-nums">
                          {r.target.toFixed(1)}s → {r.elapsed.toFixed(2)}s
                        </span>
                        <span className="ml-auto font-bold tabular-nums text-accent">
                          {r.points.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          Off by {r.diff.toFixed(2)}s
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tierBar[r.tier]}`}
                            style={{ width: `${accuracy * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

const tintStyles: Record<string, string> = {
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  pink: "border-pink-500/20 bg-pink-500/10 text-pink-400",
  cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  violet: "border-violet-500/20 bg-violet-500/10 text-violet-400",
};

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tint: keyof typeof tintStyles;
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${tintStyles[tint]}`}>
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{value}</p>
    </div>
  );
}
