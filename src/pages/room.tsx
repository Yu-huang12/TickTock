import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "@/components/Confetti";
import { QrInvite } from "@/components/QrInvite";
import {
  Play,
  Square,
  Sparkles,
  Crown,
  Trophy,
  Copy,
  Check,
  LogOut,
  Loader2,
  Users,
  Hourglass,
} from "lucide-react";
import { useRoom } from "@/lib/room-context";
import {
  tierFor,
  pointsFor,
  tierStyle,
  tierEmoji,
  playerColors,
  type Tier,
} from "@/lib/game-utils";

const ROUND_OPTIONS = [3, 5, 10];
type LocalPhase = "idle" | "running" | "done";

interface LocalResult {
  elapsed: number;
  diff: number;
  tier: Tier;
  points: number;
}

export default function RoomPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { myId, status, room, roster, results, startGame, submitResult, leaveRoom } = useRoom();

  const [copied, setCopied] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [localPhase, setLocalPhase] = useState<LocalPhase>("idle");
  const [localResult, setLocalResult] = useState<LocalResult | null>(null);
  const startRef = useRef(0);

  const isHost = !!room && !!myId && room.hostId === myId;

  // Keep the host's rounds selector in sync with the room's configured value.
  useEffect(() => {
    if (room) setRounds(room.totalRounds);
  }, [room?.totalRounds]);

  // Reset local play state at the start of each new round.
  useEffect(() => {
    setLocalPhase("idle");
    setLocalResult(null);
  }, [room?.targetSeq, room?.status]);

  const totals = useMemo(() => {
    const map = new Map<
      string,
      { playerId: string; name: string; colorIdx: number; total: number }
    >();
    for (const p of roster) {
      map.set(p.playerId, { playerId: p.playerId, name: p.name, colorIdx: p.colorIdx, total: 0 });
    }
    for (const r of results) {
      const prev = map.get(r.playerId) ?? {
        playerId: r.playerId,
        name: r.name,
        colorIdx: r.colorIdx,
        total: 0,
      };
      prev.total += r.points;
      prev.name = r.name;
      prev.colorIdx = r.colorIdx;
      map.set(r.playerId, prev);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [roster, results]);

  const submittedThisRound = useMemo(
    () => new Set(results.filter((r) => room && r.round === room.currentRound).map((r) => r.playerId)),
    [results, room]
  );
  const waitingOn = roster.filter((p) => !submittedThisRound.has(p.playerId));

  const startPlay = () => {
    setLocalPhase("running");
    startRef.current = performance.now();
  };

  const stopPlay = () => {
    if (!room || room.currentTarget == null) return;
    const elapsed = (performance.now() - startRef.current) / 1000;
    const diff = Math.abs(elapsed - room.currentTarget);
    setLocalResult({ elapsed, diff, tier: tierFor(diff), points: pointsFor(diff) });
    setLocalPhase("done");
    void submitResult(elapsed);
  };

  // Spacebar drives start / stop during play.
  const actionRef = useRef<() => void>(() => {});
  actionRef.current = () => {
    if (!room || room.status !== "playing") return;
    if (localPhase === "idle") startPlay();
    else if (localPhase === "running") stopPlay();
  };

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

  const handleLeave = () => {
    leaveRoom();
    navigate("/online");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  // Not connected to this room (deep link / refresh) → go enter a name first.
  if (!room || room.code !== code) {
    if (status === "connecting") {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          Connecting&hellip;
        </div>
      );
    }
    return <Navigate to={`/online?room=${code}`} replace />;
  }

  const inviteUrl = `${window.location.origin}/online?room=${code}`;

  // ─────────────────────────────────────────────────────────── LOBBY
  if (room.status === "lobby") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Room code</p>
          <button
            onClick={copyCode}
            className="mx-auto mt-1 flex items-center gap-2 text-5xl font-black tracking-[0.2em] text-gradient"
            title="Copy code"
          >
            {code}
            {copied ? (
              <Check className="size-6 text-emerald-400" />
            ) : (
              <Copy className="size-6 text-muted-foreground" />
            )}
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="items-center gap-3 border-border/60 bg-card/60 p-5 text-center backdrop-blur-xl">
            <h2 className="font-semibold">Scan to join</h2>
            <QrInvite value={inviteUrl} size={180} />
            <p className="text-xs text-muted-foreground">
              Scan with any phone camera, or share the code.
            </p>
          </Card>

          <Card className="gap-3 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-4" /> Players ({roster.length})
            </h2>
            <div className="flex flex-col gap-2">
              {roster.map((p) => {
                const c = playerColors[p.colorIdx % playerColors.length];
                return (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${c.bg} text-sm font-bold text-white`}
                    >
                      {(p.name.trim()[0] || "P").toUpperCase()}
                    </span>
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                    {room.hostId === p.playerId && (
                      <Crown className="size-4 text-accent" aria-label="Host" />
                    )}
                    {p.playerId === myId && (
                      <span className="text-xs text-muted-foreground">you</span>
                    )}
                  </div>
                );
              })}
              {roster.length === 0 && (
                <p className="text-sm text-muted-foreground">Waiting for players&hellip;</p>
              )}
            </div>
          </Card>
        </div>

        {isHost ? (
          <Card className="gap-4 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <h2 className="font-semibold">Rounds per player</h2>
            <div className="grid grid-cols-3 gap-3">
              {ROUND_OPTIONS.map((r) => {
                const active = rounds === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRounds(r)}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 py-4 transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-[0_0_25px_-6px_rgba(236,72,153,0.6)]"
                        : "border-border/60 bg-muted/20 hover:border-border"
                    }`}
                  >
                    <span className="text-2xl font-black tabular-nums">{r}</span>
                    <span className="text-xs text-muted-foreground">rounds</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => startGame(rounds)}
              disabled={roster.length < 1}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 py-3.5 text-base font-bold text-white shadow-[0_10px_40px_-12px_rgba(168,85,247,0.7)] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <Play className="size-5 fill-current" /> Start Game
            </button>
          </Card>
        ) : (
          <Card className="items-center gap-2 border-border/60 bg-card/60 p-6 text-center backdrop-blur-xl">
            <Hourglass className="size-6 animate-pulse text-secondary" />
            <p className="font-medium">Waiting for the host to start&hellip;</p>
          </Card>
        )}

        <button
          onClick={handleLeave}
          className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-4" /> Leave room
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────── FINISHED
  if (room.status === "finished") {
    const winner = totals[0];
    return (
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6">
        <Confetti />
        {winner && (
          <div className="glow-pop flex flex-col items-center gap-2 text-center">
            <Crown className="size-12 text-accent" />
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Winner</p>
            <h1
              className={`text-4xl font-black ${playerColors[winner.colorIdx % playerColors.length].text}`}
            >
              {winner.name}
            </h1>
            <p className="text-xl font-bold text-accent">{winner.total.toLocaleString()} pts</p>
          </div>
        )}

        <Card className="w-full gap-0 divide-y divide-border/60 border-border/60 bg-card/60 p-0 backdrop-blur-xl">
          {totals.map((p, i) => {
            const c = playerColors[p.colorIdx % playerColors.length];
            return (
              <div key={p.playerId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${c.bg}`} />
                <span className="flex-1 truncate font-medium">{p.name}</span>
                {i === 0 && <Trophy className="size-4 text-accent" />}
                <span className="font-bold tabular-nums">{p.total.toLocaleString()}</span>
              </div>
            );
          })}
        </Card>

        <div className="flex gap-3">
          {isHost && (
            <button
              onClick={() => startGame(room.totalRounds)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 font-bold text-white shadow-lg transition-transform active:scale-95"
            >
              <Sparkles className="size-4" /> Play again
            </button>
          )}
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 font-medium transition-colors hover:bg-muted"
          >
            <LogOut className="size-4" /> Leave
          </button>
        </div>
        {!isHost && (
          <p className="text-xs text-muted-foreground">Waiting for the host for a rematch&hellip;</p>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────── PLAYING
  const celebrate =
    localResult && (localResult.tier === "Perfect" || localResult.tier === "Great");

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="relative overflow-hidden border-border/60 bg-card/60 p-0 backdrop-blur-xl">
          {celebrate && <Confetti />}
          <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
            <Badge variant="outline">
              Round {room.currentRound}/{room.totalRounds}
            </Badge>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Target</p>
              <p className="text-6xl font-black tabular-nums">
                <span className="bg-gradient-to-br from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  {room.currentTarget?.toFixed(1)}
                </span>
                <span className="ml-1 text-3xl font-bold text-cyan-300/70">s</span>
              </p>
            </div>

            {localPhase === "idle" && (
              <button
                onClick={startPlay}
                className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_0_55px_-8px_rgba(236,72,153,0.6)] transition-transform active:scale-95"
              >
                <Play className="size-8 fill-current" />
                <span className="mt-1 text-lg font-bold">START</span>
              </button>
            )}

            {localPhase === "running" && (
              <button
                onClick={stopPlay}
                className="pulse-ring flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-2xl transition-transform active:scale-95"
              >
                <Square className="size-7 fill-current" />
                <span className="mt-1 text-lg font-bold">STOP</span>
              </button>
            )}

            {localPhase === "done" && localResult && (
              <div className="glow-pop flex flex-col items-center gap-3">
                <Badge className={`px-4 py-1 text-base ${tierStyle[localResult.tier]}`}>
                  {tierEmoji[localResult.tier]} {localResult.tier}
                </Badge>
                <p className="text-4xl font-black tabular-nums">
                  {localResult.elapsed.toFixed(2)}s
                </p>
                <p className="text-sm text-muted-foreground">
                  {localResult.diff.toFixed(2)}s off &middot; +
                  {localResult.points.toLocaleString()} pts
                </p>
                {waitingOn.length > 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hourglass className="size-4 animate-pulse" />
                    Waiting for {waitingOn.map((p) => p.name).join(", ")}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Next round&hellip;
                  </p>
                )}
              </div>
            )}

            {localPhase !== "done" && (
              <p className="text-xs text-muted-foreground">
                press{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  Space
                </kbd>{" "}
                to start / stop
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="h-fit gap-3 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="flex items-center gap-2 font-bold">
          <Trophy className="size-4 text-accent" /> Leaderboard
        </h2>
        <div className="flex flex-col gap-2">
          {totals.map((p, i) => {
            const c = playerColors[p.colorIdx % playerColors.length];
            const done = submittedThisRound.has(p.playerId);
            return (
              <div
                key={p.playerId}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  p.playerId === myId ? "bg-muted/50" : "bg-muted/20"
                }`}
              >
                <span className="w-4 text-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${c.bg} text-xs font-bold text-white`}
                >
                  {(p.name.trim()[0] || "P").toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                {done ? (
                  <Check className="size-3.5 text-emerald-400" aria-label="submitted" />
                ) : (
                  <Hourglass className="size-3.5 text-muted-foreground" aria-label="waiting" />
                )}
                <span className="w-12 text-right text-sm font-bold tabular-nums">
                  {p.total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={handleLeave}
          className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Leave
        </button>
      </Card>
    </div>
  );
}
