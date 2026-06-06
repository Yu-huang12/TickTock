import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, ensureSignedIn } from "./supabase";
import { randomTarget, tierFor, pointsFor, type Tier } from "./game-utils";

export type ConnStatus = "idle" | "connecting" | "connected" | "error";

export interface Profile {
  name: string;
  colorIdx: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  currentRound: number;
  totalRounds: number;
  currentTarget: number | null;
  targetSeq: number;
  drinking: boolean;
}

export interface RosterPlayer {
  playerId: string;
  name: string;
  colorIdx: number;
  joinedAt: number;
}

export interface ResultRow {
  round: number;
  playerId: string;
  name: string;
  colorIdx: number;
  elapsed: number;
  diff: number;
  tier: Tier;
  points: number;
}

interface RoomContextValue {
  myId: string | null;
  status: ConnStatus;
  room: RoomState | null;
  roster: RosterPlayer[];
  results: ResultRow[];
  error: string | null;
  createRoom: (profile: Profile, totalRounds: number) => Promise<string>;
  joinRoom: (code: string, profile: Profile) => Promise<string>;
  leaveRoom: () => void;
  startGame: (totalRounds?: number) => Promise<void>;
  returnToLobby: () => Promise<void>;
  kickPlayer: (playerId: string) => void;
  setDrinking: (value: boolean) => Promise<void>;
  submitResult: (elapsed: number) => Promise<void>;
  updateProfile: (profile: Profile) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(len = 4): string {
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
  return out;
}

interface RoomRow {
  code: string;
  host_id: string;
  status: RoomState["status"];
  current_round: number;
  total_rounds: number;
  current_target: number | string | null;
  target_seq: number;
  drinking: boolean | null;
}

interface ResultDbRow {
  round: number;
  player_id: string;
  name: string;
  color_idx: number;
  elapsed: number | string;
  diff: number | string;
  tier: string;
  points: number;
}

function mapRoom(r: RoomRow): RoomState {
  return {
    code: r.code,
    hostId: r.host_id,
    status: r.status,
    currentRound: r.current_round,
    totalRounds: r.total_rounds,
    currentTarget: r.current_target != null ? Number(r.current_target) : null,
    targetSeq: r.target_seq,
    drinking: r.drinking ?? false,
  };
}

function mapResult(r: ResultDbRow): ResultRow {
  return {
    round: r.round,
    playerId: r.player_id,
    name: r.name,
    colorIdx: r.color_idx,
    elapsed: Number(r.elapsed),
    diff: Number(r.diff),
    tier: r.tier as Tier,
    points: r.points,
  };
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const [myId, setMyId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const myIdRef = useRef<string | null>(null);
  const profileRef = useRef<Profile>({ name: "Player", colorIdx: 0 });
  const joinedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef<Set<number>>(new Set());
  const advancingRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped whenever results are intentionally reset (e.g. a rematch) so any
  // in-flight refetch from the previous game is ignored when it resolves.
  const resultsGenRef = useRef(0);

  const roomRef = useRef<RoomState | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  /** Cancel any pending round-advance timer. */
  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const refetchResults = useCallback(async (code: string) => {
    if (!supabase) return;
    const gen = resultsGenRef.current;
    const { data } = await supabase
      .from("round_results")
      .select("*")
      .eq("room_code", code)
      .order("created_at", { ascending: true });
    // A reset happened while this query was in flight — drop the stale data.
    if (gen !== resultsGenRef.current) return;
    if (data) setResults((data as ResultDbRow[]).map(mapResult));
  }, []);

  const connect = useCallback(
    async (code: string, id: string) => {
      if (!supabase) throw new Error("Online play is not configured.");
      const sb = supabase;

      if (channelRef.current) {
        await sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      submittedRef.current.clear();
      advancingRef.current = null;
      clearAdvanceTimer();
      // Drop any results from a previously connected room.
      resultsGenRef.current++;
      setResults([]);
      joinedAtRef.current = Date.now();
      setStatus("connecting");

      const channel = sb.channel(`room:${code}`, {
        config: { presence: { key: id } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<RosterPlayer>();
        const players: RosterPlayer[] = [];
        const seen = new Set<string>();
        for (const key of Object.keys(state)) {
          const meta = state[key]?.[0];
          if (!meta || seen.has(meta.playerId)) continue;
          seen.add(meta.playerId);
          players.push({
            playerId: meta.playerId,
            name: meta.name,
            colorIdx: meta.colorIdx,
            joinedAt: meta.joinedAt,
          });
        }
        players.sort((a, b) => a.joinedAt - b.joinedAt);
        setRoster(players);
      });

      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setRoom(null);
            setError("The host closed the room.");
            return;
          }
          setRoom(mapRoom(payload.new as RoomRow));
        }
      );

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_results",
          filter: `room_code=eq.${code}`,
        },
        () => {
          void refetchResults(code);
        }
      );

      // The host can remove a player by broadcasting a kick. Only the targeted
      // client acts on it: it tears down and shows a message.
      channel.on("broadcast", { event: "kick" }, ({ payload }) => {
        if (!payload || payload.playerId !== id) return;
        if (channelRef.current) {
          void sb.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        submittedRef.current.clear();
        advancingRef.current = null;
        clearAdvanceTimer();
        resultsGenRef.current++;
        setResults([]);
        setRoster([]);
        setRoom(null);
        setStatus("idle");
        setError("The host removed you from the room.");
      });

      channel.subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          const { data: roomRow } = await sb
            .from("rooms")
            .select("*")
            .eq("code", code)
            .maybeSingle();
          if (roomRow) setRoom(mapRoom(roomRow as RoomRow));
          await refetchResults(code);
          await channel.track({
            playerId: id,
            name: profileRef.current.name,
            colorIdx: profileRef.current.colorIdx,
            joinedAt: joinedAtRef.current,
          });
          setStatus("connected");
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          setStatus("error");
          setError("Lost connection to the room.");
        }
      });
    },
    [refetchResults, clearAdvanceTimer]
  );

  const createRoom = useCallback(
    async (profile: Profile, totalRounds: number) => {
      if (!supabase) throw new Error("Online play is not configured.");
      const id = await ensureSignedIn();
      if (!id) throw new Error("Could not sign in. Enable anonymous auth in Supabase.");
      profileRef.current = profile;
      myIdRef.current = id;
      setMyId(id);
      setError(null);

      let code = "";
      for (let attempt = 0; attempt < 6; attempt++) {
        code = genCode();
        const { error: insertError } = await supabase.from("rooms").insert({
          code,
          host_id: id,
          status: "lobby",
          current_round: 0,
          total_rounds: totalRounds,
          target_seq: 0,
        });
        if (!insertError) break;
        if (attempt === 5) throw insertError;
      }

      await connect(code, id);
      return code;
    },
    [connect]
  );

  const joinRoom = useCallback(
    async (rawCode: string, profile: Profile) => {
      if (!supabase) throw new Error("Online play is not configured.");
      const id = await ensureSignedIn();
      if (!id) throw new Error("Could not sign in. Enable anonymous auth in Supabase.");
      const code = rawCode.trim().toUpperCase();

      const { data, error: selErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (selErr) throw selErr;
      if (!data) throw new Error(`Room "${code}" was not found.`);

      profileRef.current = profile;
      myIdRef.current = id;
      setMyId(id);
      setError(null);
      setRoom(mapRoom(data as RoomRow));

      await connect(code, id);
      return code;
    },
    [connect]
  );

  const leaveRoom = useCallback(() => {
    if (channelRef.current && supabase) void supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    submittedRef.current.clear();
    advancingRef.current = null;
    clearAdvanceTimer();
    setRoom(null);
    setRoster([]);
    setResults([]);
    setStatus("idle");
    setError(null);
  }, [clearAdvanceTimer]);

  const startGame = useCallback(async (totalRounds?: number) => {
    const current = roomRef.current;
    if (!supabase || !current) return;
    await supabase.from("round_results").delete().eq("room_code", current.code);
    // Clear results locally and invalidate in-flight refetches so the host
    // doesn't read the previous game's round-1 results and instantly advance.
    resultsGenRef.current++;
    setResults([]);
    submittedRef.current.clear();
    advancingRef.current = null;
    clearAdvanceTimer();
    await supabase
      .from("rooms")
      .update({
        status: "playing",
        current_round: 1,
        total_rounds: totalRounds ?? current.totalRounds,
        current_target: randomTarget(),
        target_seq: current.targetSeq + 1,
      })
      .eq("code", current.code);
  }, [clearAdvanceTimer]);

  // Host-only: send everyone back to the lobby for a rematch so the host can
  // tweak rounds or let new players join before starting again.
  const returnToLobby = useCallback(async () => {
    const current = roomRef.current;
    if (!supabase || !current) return;
    await supabase.from("round_results").delete().eq("room_code", current.code);
    resultsGenRef.current++;
    setResults([]);
    submittedRef.current.clear();
    advancingRef.current = null;
    clearAdvanceTimer();
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        current_round: 0,
        current_target: null,
        target_seq: current.targetSeq + 1,
      })
      .eq("code", current.code);
  }, [clearAdvanceTimer]);

  const submitResult = useCallback(async (elapsed: number) => {
    const current = roomRef.current;
    if (!supabase || !current || current.currentTarget == null) return;
    if (submittedRef.current.has(current.currentRound)) return;
    submittedRef.current.add(current.currentRound);

    const diff = Math.abs(elapsed - current.currentTarget);
    const profile = profileRef.current;
    const { error: insErr } = await supabase.from("round_results").insert({
      room_code: current.code,
      round: current.currentRound,
      player_id: myIdRef.current,
      name: profile.name,
      color_idx: profile.colorIdx,
      elapsed: Number(elapsed.toFixed(3)),
      diff: Number(diff.toFixed(3)),
      tier: tierFor(diff),
      points: pointsFor(diff),
    });
    if (insErr) submittedRef.current.delete(current.currentRound);
  }, []);

  // Host-only: remove a player from the room by broadcasting a kick that the
  // targeted client acts on. Presence then drops them from everyone's roster.
  const kickPlayer = useCallback((playerId: string) => {
    const channel = channelRef.current;
    const current = roomRef.current;
    if (!channel || !current) return;
    if (current.hostId !== myIdRef.current || playerId === myIdRef.current) return;
    void channel.send({ type: "broadcast", event: "kick", payload: { playerId } });
  }, []);

  const updateProfile = useCallback((profile: Profile) => {
    profileRef.current = profile;
    const channel = channelRef.current;
    if (channel && myIdRef.current) {
      void channel.track({
        playerId: myIdRef.current,
        name: profile.name,
        colorIdx: profile.colorIdx,
        joinedAt: joinedAtRef.current,
      });
    }
  }, []);

  // Host-only: toggle the drinking game for the room (only meaningful in the lobby).
  const setDrinking = useCallback(async (value: boolean) => {
    const current = roomRef.current;
    if (!supabase || !current || current.hostId !== myIdRef.current) return;
    await supabase.from("rooms").update({ drinking: value }).eq("code", current.code);
  }, []);

  // Clear per-round submit guard whenever we are not actively playing (covers rematches).
  useEffect(() => {
    if (room && room.status !== "playing") submittedRef.current.clear();
  }, [room?.status]);

  // Host-authoritative: once every present player has submitted, advance the round.
  const advance = useCallback(async () => {
    const current = roomRef.current;
    if (!supabase || !current || current.status !== "playing") return;
    const { error: advErr } =
      current.currentRound >= current.totalRounds
        ? await supabase.from("rooms").update({ status: "finished" }).eq("code", current.code)
        : await supabase
            .from("rooms")
            .update({
              current_round: current.currentRound + 1,
              current_target: randomTarget(),
              target_seq: current.targetSeq + 1,
            })
            .eq("code", current.code);
    // If the host's write failed, release the guard so a later effect run retries.
    if (advErr) advancingRef.current = null;
  }, []);

  useEffect(() => {
    if (!room || !myId || room.hostId !== myId || room.status !== "playing") return;
    if (roster.length === 0) return;
    const submitted = new Set(
      results.filter((r) => r.round === room.currentRound).map((r) => r.playerId)
    );
    const allIn = roster.every((p) => submitted.has(p.playerId));
    if (!allIn) return;
    if (advancingRef.current === room.currentRound) return;
    // Commit to advancing this round exactly once. The timer lives in a ref
    // (not the effect cleanup) so a re-render from a presence "sync" or a
    // results refetch during the grace period can't cancel it and stall the game.
    advancingRef.current = room.currentRound;
    clearAdvanceTimer();
    // Give players longer to read the "who drinks" callout when the drinking
    // game is on, otherwise a brief beat before the next round.
    const grace = room.drinking ? 3600 : 1600;
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      void advance();
    }, grace);
  }, [room, myId, roster, results, advance, clearAdvanceTimer]);

  // Cancel any pending advance when the provider unmounts.
  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

  const value: RoomContextValue = {
    myId,
    status,
    room,
    roster,
    results,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    returnToLobby,
    kickPlayer,
    setDrinking,
    submitResult,
    updateProfile,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}
