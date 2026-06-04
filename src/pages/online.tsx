import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  LogIn,
  ScanLine,
  Loader2,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useRoom, type Profile } from "@/lib/room-context";
import { playerColors } from "@/lib/game-utils";

const QrScanner = lazy(() =>
  import("@/components/QrScanner").then((m) => ({ default: m.QrScanner }))
);

const ROUND_OPTIONS = [3, 5, 10];

/** Pull a room code out of a scanned QR payload (either a join URL or a bare code). */
function extractCode(text: string): string | null {
  try {
    const url = new URL(text);
    const param = url.searchParams.get("room");
    if (param) return param.toUpperCase();
  } catch {
    // not a URL — fall through
  }
  const bare = text.trim().toUpperCase();
  return /^[A-Z0-9]{4,6}$/.test(bare) ? bare : null;
}

export default function OnlinePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { createRoom, joinRoom } = useRoom();

  const [name, setName] = useState("Player");
  const [colorIdx, setColorIdx] = useState(0);
  const [rounds, setRounds] = useState(3);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Auto-fill the code when arriving from a QR link (/online?room=CODE).
  useEffect(() => {
    const invited = params.get("room");
    if (invited) setCode(invited.toUpperCase());
  }, [params]);

  const profile = (): Profile => ({ name: name.trim() || "Player", colorIdx });

  const handleCreate = async () => {
    setError(null);
    setBusy("create");
    try {
      const created = await createRoom(profile(), rounds);
      navigate(`/room/${created}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room.");
      setBusy(null);
    }
  };

  const handleJoin = async (joinCode = code) => {
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      setError("Enter the 4-character room code.");
      return;
    }
    setError(null);
    setBusy("join");
    try {
      const joined = await joinRoom(clean, profile());
      navigate(`/room/${joined}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join room.");
      setBusy(null);
    }
  };

  const onScan = (text: string) => {
    setScanning(false);
    const found = extractCode(text);
    if (found) {
      setCode(found);
      void handleJoin(found);
    } else {
      setError("That QR code isn't a Tick Tock room.");
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <header className="text-center">
          <h1 className="text-3xl font-black text-gradient">Play Online</h1>
        </header>
        <Card className="gap-3 border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="size-5" /> Backend not configured yet
          </h2>
          <p className="text-sm text-muted-foreground">
            Online multiplayer needs a free Supabase project. To enable it:
          </p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>
              Create a project at <span className="font-mono text-foreground">supabase.com</span>.
            </li>
            <li>
              Run <span className="font-mono text-foreground">supabase/schema.sql</span> in the SQL
              editor.
            </li>
            <li>
              Enable <span className="font-medium text-foreground">Anonymous</span> sign-ins under
              Authentication → Providers.
            </li>
            <li>
              Copy <span className="font-mono text-foreground">.env.example</span> to{" "}
              <span className="font-mono text-foreground">.env</span> and add your project URL + anon
              key.
            </li>
            <li>Restart the dev server.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Until then you can still play{" "}
            <button
              onClick={() => navigate("/multiplayer")}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Pass &amp; Play
            </button>{" "}
            on one device.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      {scanning && (
        <Suspense fallback={null}>
          <QrScanner onResult={onScan} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-black">
          <Globe className="size-7 text-secondary" />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
            Play Online
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a room or join with a code &mdash; friends play from their own phones.
        </p>
      </header>

      <Card className="gap-4 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="font-semibold">You</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setColorIdx((i) => (i + 1) % playerColors.length)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${playerColors[colorIdx].bg} text-lg font-bold text-white shadow transition-transform active:scale-90`}
            title="Tap to change colour"
            aria-label="Change colour"
          >
            {(name.trim()[0] || "P").toUpperCase()}
          </button>
          <Input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {playerColors.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColorIdx(i)}
              aria-label={c.name}
              className={`h-7 w-7 rounded-full bg-gradient-to-br ${c.bg} transition-transform active:scale-90 ${
                colorIdx === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
              }`}
            />
          ))}
        </div>
      </Card>

      <Card className="gap-4 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="font-semibold">Create a room</h2>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Rounds per player</p>
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
        </div>
        <button
          onClick={handleCreate}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 py-3.5 text-base font-bold text-white shadow-[0_10px_40px_-12px_rgba(168,85,247,0.7)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "create" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Plus className="size-5" />
          )}
          Create room
        </button>
      </Card>

      <Card className="gap-4 border-border/60 bg-card/60 p-5 backdrop-blur-xl">
        <h2 className="font-semibold">Join a room</h2>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="CODE"
            maxLength={6}
            className="flex-1 text-center text-lg font-bold tracking-[0.3em] uppercase"
          />
          <button
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 text-sm font-medium transition-colors hover:bg-muted"
            title="Scan QR code"
          >
            <ScanLine className="size-4" /> Scan
          </button>
        </div>
        <button
          onClick={() => handleJoin()}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/15 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary/25 disabled:opacity-60"
        >
          {busy === "join" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <LogIn className="size-5" />
          )}
          Join room
        </button>
      </Card>

      {error && (
        <p className="text-center text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
