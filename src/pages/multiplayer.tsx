import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Confetti } from "@/components/Confetti";
import {
  Play,
  Square,
  Plus,
  X,
  Crown,
  ArrowRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  randomTarget,
  tierFor,
  pointsFor,
  tierStyle,
  tierEmoji,
  celebrates,
  playerColors,
  type Tier,
} from "@/lib/game-utils";
import { hapticTap, hapticResult, keepAwake, allowSleep } from "@/lib/native";
import { Segmented } from "@/components/ui/segmented";

interface Player {
  id: string;
  name: string;
  colorIdx: number;
  total: number;
}

interface TurnResult {
  elapsed: number;
  diff: number;
  tier: Tier;
  points: number;
}

type Phase = "setup" | "play" | "results";
type TurnPhase = "idle" | "running" | "done";

const ROUND_OPTIONS = [3, 5, 10];

let pidCounter = 0;
const newId = () => `p${pidCounter++}`;

export default function MultiplayerPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<Player[]>([
    { id: newId(), name: "Player 1", colorIdx: 0, total: 0 },
    { id: newId(), name: "Player 2", colorIdx: 1, total: 0 },
  ]);
  const [totalRounds, setTotalRounds] = useState(3);

  const [round, setRound] = useState(1);
  const [turnIdx, setTurnIdx] = useState(0);
  const [target, setTarget] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("idle");
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const startRef = useRef(0);

  const addPlayer = () =>
    setPlayers((ps) => {
      if (ps.length >= 6) return ps;
      const used = new Set(ps.map((p) => p.colorIdx));
      let colorIdx = 0;
      for (let i = 0; i < playerColors.length; i++) {
        if (!used.has(i)) {
          colorIdx = i;
          break;
        }
      }
      // Name with the smallest unused "Player N" so add/remove cycles never
      // produce duplicate default names (length-based numbering collides).
      const usedNums = new Set(
        ps
          .map((p) => /^Player (\d+)$/.exec(p.name)?.[1])
          .filter((n): n is string => n != null)
          .map(Number)
      );
      let n = 1;
      while (usedNums.has(n)) n++;
      return [...ps, { id: newId(), name: `Player ${n}`, colorIdx, total: 0 }];
    });

  const removePlayer = (id: string) =>
    setPlayers((ps) => (ps.length <= 2 ? ps : ps.filter((p) => p.id !== id)));

  const renamePlayer = (id: string, name: string) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));

  const cycleColor = (id: string) =>
    setPlayers((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, colorIdx: (p.colorIdx + 1) % playerColors.length } : p
      )
    );

  const startGame = () => {
    setPlayers((ps) => ps.map((p) => ({ ...p, total: 0 })));
    setRound(1);
    setTurnIdx(0);
    setTarget(randomTarget());
    setTurnPhase("idle");
    setTurnResult(null);
    setPhase("play");
  };

  const startTurn = () => {
    startRef.current = performance.now();
    setTurnPhase("running");
    void hapticTap();
    void keepAwake();
  };

  const stopTurn = () => {
    const elapsed = (performance.now() - startRef.current) / 1000;
    const diff = Math.abs(elapsed - target);
    const tier = tierFor(diff);
    const points = pointsFor(diff);
    setTurnResult({ elapsed, diff, tier, points });
    setPlayers((ps) => ps.map((p, i) => (i === turnIdx ? { ...p, total: p.total + points } : p)));
    setTurnPhase("done");
    void hapticResult(celebrates(diff));
    void allowSleep();
  };

  const advance = () => {
    const isLastPlayer = turnIdx === players.length - 1;
    if (!isLastPlayer) {
      setTurnIdx((i) => i + 1);
      setTurnPhase("idle");
      setTurnResult(null);
      return;
    }
    if (round >= totalRounds) {
      setPhase("results");
      return;
    }
    setRound((r) => r + 1);
    setTurnIdx(0);
    setTarget(randomTarget());
    setTurnPhase("idle");
    setTurnResult(null);
  };

  // Spacebar acts as start / stop / next during a player's turn.
  const actionRef = useRef<() => void>(() => {});
  actionRef.current =
    phase !== "play"
      ? () => {}
      : turnPhase === "idle"
        ? startTurn
        : turnPhase === "running"
          ? stopTurn
          : advance;

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

  const ranking = useMemo(
    () => [...players].sort((a, b) => b.total - a.total),
    [players]
  );

  // ---------------------------------------------------------------- SETUP
  if (phase === "setup") {
    const totalTurns = players.length * totalRounds;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-7">
        <header className="text-center">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
              Who&rsquo;s playing?
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add 2–6 players, then pass the device between turns.
          </p>
        </header>

        <Card className="app-card gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Players</h2>
            <button
              onClick={addPlayer}
              disabled={players.length >= 6}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 text-sm font-semibold text-white shadow transition-transform active:scale-95 disabled:opacity-40"
            >
              <Plus className="size-4" /> Add player
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {players.map((p) => {
              const c = playerColors[p.colorIdx];
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cycleColor(p.id)}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${c.bg} text-base font-bold text-white shadow transition-transform active:scale-90`}
                    title="Tap to change colour"
                    aria-label="Change colour"
                  >
                    {(p.name.trim()[0] || "P").toUpperCase()}
                  </button>
                  <Input
                    value={p.name}
                    maxLength={16}
                    onChange={(e) => renamePlayer(p.id, e.target.value)}
                    className="flex-1"
                  />
                  {players.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePlayer(p.id)}
                      aria-label="Remove player"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="app-card gap-4 p-5">
          <h2 className="font-semibold">Rounds per player</h2>
          <Segmented options={ROUND_OPTIONS} value={totalRounds} onChange={setTotalRounds} />
          <p className="text-center text-xs text-muted-foreground">
            Total turns: {players.length} players × {totalRounds} rounds ={" "}
            <span className="font-bold text-foreground">{totalTurns}</span>
          </p>
        </Card>

        <button onClick={startGame} className="btn-cta">
          <Play className="size-5 fill-current" /> Start Game
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------- RESULTS
  if (phase === "results") {
    const winner = ranking[0];
    return (
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6">
        <Confetti />
        <div className="glow-pop flex flex-col items-center gap-2 text-center">
          <Crown className="h-12 w-12 text-accent" />
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Winner</p>
          <h1 className={`text-4xl font-black ${playerColors[winner.colorIdx].text}`}>
            {winner.name || "Player"}
          </h1>
          <p className="text-xl font-bold text-accent">{winner.total.toLocaleString()} pts</p>
        </div>

        <Card className="app-card w-full gap-0 divide-y divide-border/60 p-0">
          {ranking.map((p, i) => {
            const c = playerColors[p.colorIdx];
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${c.bg}`} />
                <span className="flex-1 truncate font-medium">{p.name || "Player"}</span>
                {i === 0 && <Trophy className="h-4 w-4 text-accent" />}
                <span className="font-bold tabular-nums">{p.total.toLocaleString()}</span>
              </div>
            );
          })}
        </Card>

        <div className="flex gap-3">
          <Button onClick={startGame} className="gap-2">
            <RotateCcw className="size-4" /> Rematch
          </Button>
          <Button variant="outline" onClick={() => setPhase("setup")}>
            Edit players
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------- PLAY
  const current = players[turnIdx];
  const c = playerColors[current.colorIdx];
  const celebrate = turnResult && celebrates(turnResult.diff);
  const isFinalTurn = turnIdx === players.length - 1 && round >= totalRounds;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6">
      <div className="flex w-full flex-wrap justify-center gap-2">
        {players.map((p, i) => {
          const pc = playerColors[p.colorIdx];
          return (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-all ${
                i === turnIdx
                  ? `bg-gradient-to-r ${pc.bg} text-white shadow-lg`
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <span className="max-w-[8rem] truncate font-semibold">{p.name || "Player"}</span>
              <span className="tabular-nums opacity-80">{p.total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      <Badge variant="outline">
        Round {round}/{totalRounds}
      </Badge>

      <Card className="app-card relative w-full overflow-hidden">
        {celebrate && <Confetti />}
        <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
          <div
            className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${c.bg} px-4 py-1 text-white shadow`}
          >
            <span className="font-bold">{current.name || "Player"}&rsquo;s turn</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Target</p>
            <p className="text-5xl font-black tabular-nums text-gradient">{target.toFixed(1)}s</p>
          </div>

          {turnPhase === "idle" && (
            <button
              onClick={startTurn}
              className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_0_55px_-8px_rgba(236,72,153,0.6)] transition-transform active:scale-95"
              aria-label="Start timer"
            >
              <Play className="h-7 w-7 fill-current" />
              <span className="mt-1 font-bold">START</span>
            </button>
          )}

          {turnPhase === "running" && (
            <button
              onClick={stopTurn}
              className="pulse-ring flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-2xl transition-transform active:scale-95"
            >
              <Square className="h-7 w-7 fill-current" />
              <span className="mt-1 font-bold">STOP</span>
            </button>
          )}

          {turnPhase === "done" && turnResult && (
            <div className="glow-pop flex flex-col items-center gap-3">
              <Badge className={`px-4 py-1 text-base ${tierStyle[turnResult.tier]}`}>
                {tierEmoji[turnResult.tier]} {turnResult.tier}
              </Badge>
              <p className="text-4xl font-black tabular-nums">{turnResult.elapsed.toFixed(2)}s</p>
              <p className="text-sm text-muted-foreground">
                {turnResult.diff.toFixed(2)}s off · +{turnResult.points.toLocaleString()} pts
              </p>
              <Button onClick={advance} className="gap-2">
                {isFinalTurn ? "See results" : "Next"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        or press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          Space
        </kbd>{" "}
        to start / stop
      </p>
    </div>
  );
}
