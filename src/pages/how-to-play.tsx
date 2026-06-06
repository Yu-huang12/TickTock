import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Target, Sparkles, Trophy } from "lucide-react";
import { tierStyle, tierEmoji, pointsFor, type Tier } from "@/lib/game-utils";

const tiers: { tier: Tier; range: string; boundary: number }[] = [
  { tier: "Perfect", range: "within 0.03s", boundary: 0 },
  { tier: "So Close", range: "within 0.08s", boundary: 0.03 },
  { tier: "Great", range: "within 0.15s", boundary: 0.08 },
  { tier: "Good", range: "within 0.30s", boundary: 0.15 },
  { tier: "Close", range: "within 0.60s", boundary: 0.3 },
  { tier: "Off", range: "0.60s or more", boundary: 0.6 },
];

const steps = [
  {
    icon: Target,
    title: "Read your target",
    text: "Each round shows a target time between 1.0s and 9.9s.",
  },
  {
    icon: Play,
    title: "Start the clock",
    text: "Hit start and begin counting in your head — the timer stays hidden, so no peeking!",
  },
  {
    icon: Square,
    title: "Stop on time",
    text: "Press stop the instant you think the target has elapsed.",
  },
  {
    icon: Sparkles,
    title: "Score big",
    text: "The closer you land, the higher your tier and points.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-black text-gradient">How to Play</h1>
        <p className="mt-2 text-muted-foreground">
          Tick Tock is a test of your internal stopwatch. No reflexes — just rhythm.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <Card key={i} className="app-card flex-row items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">
                {i + 1}. {s.title}
              </h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="app-card gap-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Trophy className="h-5 w-5 text-accent" /> Scoring tiers
        </h2>
        <div className="flex flex-col gap-2">
          {tiers.map(({ tier, range, boundary }) => (
            <div
              key={tier}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
            >
              <Badge className={`${tierStyle[tier]} px-3 py-1`}>
                {tierEmoji[tier]} {tier}
              </Badge>
              <span className="text-sm text-muted-foreground">{range}</span>
              <span className="ml-auto font-bold tabular-nums text-accent">
                up to {pointsFor(boundary).toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Land it dead-on for the full{" "}
          <span className="font-semibold text-foreground">1,000 points</span>. Points slide down
          evenly the further you drift — a full second off scores zero.
        </p>
      </Card>

      <Card className="app-card gap-2 p-5">
        <h2 className="font-bold">Pro tips</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Count in a steady &ldquo;one-Mississippi&rdquo; rhythm rather than racing.</li>
          <li>Tap your foot or nod to keep a beat — your body keeps better time than your mind.</li>
          <li>Chain Great-or-better stops in Solo to build a streak.</li>
          <li>In Multiplayer, everyone faces the same target each round — pure bragging rights.</li>
        </ul>
      </Card>
    </div>
  );
}
