import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
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
  Share2,
  LogOut,
  Loader2,
  Users,
  UserX,
  Wine,
  SkipForward,
  ArrowRight,
  Hourglass,
} from "lucide-react";
import { useRoom, type RosterPlayer } from "@/lib/room-context";
import { shareInvite } from "@/lib/native";
import {
  tierFor,
  pointsFor,
  tierStyle,
  tierEmoji,
  celebrates,
  playerColors,
  furthestPlayers,
  DRINK_NOTE,
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

interface DisplayInfo {
  name: string;
  colorIdx: number;
}

/**
 * Online players pick their own name and colour independently, so two can clash.
 * Resolve a stable, collision-free display name + colour for everyone: processed
 * in join order (same on every client), duplicate names get a "(2)" suffix and
 * repeated colours are reassigned to the next free palette slot.
 */
function resolveDisplay(roster: RosterPlayer[]): Map<string, DisplayInfo> {
  const sorted = [...roster].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId)
  );
  const usedColors = new Set<number>();
  const nameSeen = new Map<string, number>();
  const out = new Map<string, DisplayInfo>();
  for (const p of sorted) {
    let colorIdx =
      ((p.colorIdx % playerColors.length) + playerColors.length) % playerColors.length;
    if (usedColors.has(colorIdx)) {
      for (let i = 0; i < playerColors.length; i++) {
        if (!usedColors.has(i)) {
          colorIdx = i;
          break;
        }
      }
    }
    usedColors.add(colorIdx);

    const base = p.name.trim() || "Player";
    const seen = nameSeen.get(base) ?? 0;
    nameSeen.set(base, seen + 1);
    out.set(p.playerId, { name: seen === 0 ? base : `${base} (${seen + 1})`, colorIdx });
  }
  return out;
}

export default function RoomPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { myId, status, room, roster, results, startGame, returnToLobby, kickPlayer, setDrinking, forceNext, requestNext, submitResult, leaveRoom } =
    useRoom();

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

  // Collision-free display name + colour per player, shared by all clients.
  const display = useMemo(() => resolveDisplay(roster), [roster]);

  const totals = useMemo(() => {
    const map = new Map<
      string,
      { playerId: string; name: string; colorIdx: number; total: number }
    >();
    for (const p of roster) {
      const d = display.get(p.playerId);
      map.set(p.playerId, {
        playerId: p.playerId,
        name: d?.name ?? p.name,
        colorIdx: d?.colorIdx ?? p.colorIdx,
        total: 0,
      });
    }
    for (const r of results) {
      const d = display.get(r.playerId);
      const prev = map.get(r.playerId) ?? {
        playerId: r.playerId,
        name: d?.name ?? r.name,
        colorIdx: d?.colorIdx ?? r.colorIdx,
        total: 0,
      };
      prev.total += r.points;
      prev.name = d?.name ?? r.name;
      prev.colorIdx = d?.colorIdx ?? r.colorIdx;
      map.set(r.playerId, prev);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [roster, results, display]);

  const submittedThisRound = useMemo(
    () => new Set(results.filter((r) => room && r.round === room.currentRound).map((r) => r.playerId)),
    [results, room]
  );
  const waitingOn = roster.filter((p) => !submittedThisRound.has(p.playerId));

  // Drinking mode: who's furthest from the target this round (all submitted).
  const roundDrinkerNames = useMemo(() => {
    if (!room?.drinking) return [];
    const entries = results
      .filter((r) => r.round === room.currentRound)
      .map((r) => ({ id: r.playerId, diff: r.diff }));
    const ids = furthestPlayers(entries);
    return ids.map((id) => display.get(id)?.name ?? "Player");
  }, [room?.drinking, room?.currentRound, results, display]);

  // Drinking mode: the overall loser(s) at game end (lowest total).
  const loserNames = useMemo(() => {
    if (!room?.drinking || totals.length < 2) return [];
    const min = totals[totals.length - 1].total;
    return totals.filter((p) => p.total === min).map((p) => p.name);
  }, [room?.drinking, totals]);

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

  const shareInviteLink = async () => {
    const url = `${window.location.origin}/online?room=${code}`;
    const result = await shareInvite(url, {
      text: `Join my Tick Tock room! Code: ${code}`,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
            onClick={shareInviteLink}
            className="mx-auto mt-1 flex items-center gap-2 text-5xl font-black tracking-[0.2em] text-gradient"
            title="Share invite link"
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
          <Card className="app-card items-center gap-3 p-5 text-center">
            <h2 className="font-semibold">Scan to join</h2>
            <QrInvite value={inviteUrl} size={180} />
            <p className="text-xs text-muted-foreground">
              Scan with any phone camera, or share the code.
            </p>
            <button
              onClick={shareInviteLink}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-muted/40 px-4 py-2 text-sm font-semibold transition hover:bg-muted/60"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-400" /> Link copied
                </>
              ) : (
                <>
                  <Share2 className="size-4" /> Share invite
                </>
              )}
            </button>
          </Card>

          <Card className="app-card gap-3 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-4" /> Players ({roster.length})
            </h2>
            <div className="flex flex-col gap-2">
              {roster.map((p) => {
                const d = display.get(p.playerId) ?? { name: p.name, colorIdx: p.colorIdx };
                const c = playerColors[d.colorIdx % playerColors.length];
                const isMe = p.playerId === myId;
                return (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${c.bg} text-sm font-bold text-white`}
                    >
                      {(d.name.trim()[0] || "P").toUpperCase()}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {d.name}
                      {isMe && <span className="text-muted-foreground"> (me)</span>}
                    </span>
                    {room.hostId === p.playerId && (
                      <Crown className="size-4 text-accent" aria-label="Host" />
                    )}
                    {isHost && !isMe && (
                      <button
                        onClick={() => kickPlayer(p.playerId)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        title={`Remove ${d.name}`}
                        aria-label={`Remove ${d.name}`}
                      >
                        <UserX className="size-4" />
                      </button>
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
          <Card className="app-card gap-4 p-5">
            <h2 className="font-semibold">Rounds per player</h2>
            <Segmented options={ROUND_OPTIONS} value={rounds} onChange={setRounds} />

            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
              <button
                type="button"
                onClick={() => setDrinking(!room.drinking)}
                aria-pressed={room.drinking}
                className="flex items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Wine className="size-5 text-pink-400" /> Drinking game
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    room.drinking ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      room.drinking ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
              <p className="text-xs text-muted-foreground">
                {room.drinking
                  ? "Furthest from the target each round takes a shot 🍺 — overall loser finishes their drink."
                  : "Turn on to add a party penalty for whoever's furthest off."}
              </p>
              {room.drinking && (
                <p className="text-[11px] text-muted-foreground/80">{DRINK_NOTE}</p>
              )}
            </div>

            <button
              onClick={() => startGame(rounds)}
              disabled={roster.length < 1}
              className="btn-cta"
            >
              <Play className="size-5 fill-current" /> Start Game
            </button>
          </Card>
        ) : (
          <Card className="app-card items-center gap-2 p-6 text-center">
            <Hourglass className="size-6 animate-pulse text-secondary" />
            <p className="font-medium">Waiting for the host to start&hellip;</p>
            {room.drinking && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-pink-300">
                <Wine className="size-4" /> Drinking game is on
              </p>
            )}
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

        {loserNames.length > 0 && (
          <div className="flex w-full flex-col items-center gap-1 rounded-2xl border border-pink-500/30 bg-pink-500/10 px-4 py-4 text-center">
            <Wine className="size-6 text-pink-400" />
            <p className="font-bold">{loserNames.join(" & ")} finishes their drink 🍺</p>
            <p className="text-[11px] text-muted-foreground">{DRINK_NOTE}</p>
          </div>
        )}

        <Card className="app-card w-full gap-0 divide-y divide-border/60 p-0">
          {totals.map((p, i) => {
            const c = playerColors[p.colorIdx % playerColors.length];
            return (
              <div key={p.playerId} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-center font-bold text-muted-foreground">{i + 1}</span>
                <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${c.bg}`} />
                <span className="flex-1 truncate font-medium">
                  {p.name}
                  {p.playerId === myId && <span className="text-muted-foreground"> (me)</span>}
                </span>
                {i === 0 && <Trophy className="size-4 text-accent" />}
                <span className="font-bold tabular-nums">{p.total.toLocaleString()}</span>
              </div>
            );
          })}
        </Card>

        <div className="flex gap-3">
          {isHost && (
            <button
              onClick={() => returnToLobby()}
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
  const celebrate = localResult && celebrates(localResult.diff);
  const everyoneSubmitted = waitingOn.length === 0;
  const isFinalRound = room.currentRound >= room.totalRounds;
  // Drinking mode: once everyone has stopped, show a popup naming who drinks;
  // anyone can tap Next to move on (no auto-advance).
  const showDrinkPopup =
    room.drinking && everyoneSubmitted && localPhase === "done" && roundDrinkerNames.length > 0;

  return (
    <>
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="app-card relative overflow-hidden p-0">
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
                    Waiting for{" "}
                    {waitingOn
                      .map((p) => display.get(p.playerId)?.name ?? p.name)
                      .join(", ")}
                  </p>
                ) : room.drinking ? (
                  <p className="flex items-center gap-2 text-sm font-medium text-pink-300">
                    <Wine className="size-4" /> Time to drink&hellip;
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

      <Card className="app-card h-fit gap-3 p-5">
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
                <span className="flex-1 truncate text-sm font-medium">
                  {p.name}
                  {p.playerId === myId && <span className="text-muted-foreground"> (me)</span>}
                </span>
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
        {isHost && (
          <button
            onClick={() => forceNext()}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            title="Skip to the next round now (unplayed players score 0)"
          >
            <SkipForward className="size-3.5" /> Skip to next round
          </button>
        )}
        <button
          onClick={handleLeave}
          className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Leave
        </button>
      </Card>
    </div>

    {showDrinkPopup && (
      <div className="safe-top safe-bottom fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur">
        <Card className="app-card w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg">
              <Wine className="size-9 text-white" />
            </span>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Furthest from {room.currentTarget?.toFixed(1)}s
            </p>
            <h2 className="text-3xl font-black">{roundDrinkerNames.join(" & ")}</h2>
            <p className="text-lg font-bold text-pink-300">takes a shot 🍺</p>
            <button onClick={() => requestNext()} className="btn-cta mt-1">
              {isFinalRound ? "See results" : "Next round"}
              <ArrowRight className="size-5" />
            </button>
            <p className="text-[11px] text-muted-foreground/80">{DRINK_NOTE}</p>
          </div>
        </Card>
      </div>
    )}
    </>
  );
}
