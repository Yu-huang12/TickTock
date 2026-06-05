import { cn } from "@/lib/utils";

interface SegmentedProps {
  /** Selectable numeric options (e.g. rounds per player). */
  options: number[];
  /** Currently selected value. */
  value: number;
  /** Called with the chosen value. */
  onChange: (value: number) => void;
  /** Small caption shown under each number. */
  unit?: string;
  className?: string;
}

/**
 * A pill-style segmented selector used for picking rounds across the app.
 * Replaces the repeated 3-column button grids in Online, Room and Pass & Play.
 */
export function Segmented({ options, value, onChange, unit = "rounds", className }: SegmentedProps) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl py-3 transition-all active:scale-[0.97]",
              active
                ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <span className="text-xl font-black tabular-nums">{opt}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
              {unit}
            </span>
          </button>
        );
      })}
    </div>
  );
}
