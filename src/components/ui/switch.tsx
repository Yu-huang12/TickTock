import { cn } from "@/lib/utils";

interface SwitchProps {
  /** Whether the switch is on. */
  checked: boolean;
  /** Called with the new value when toggled. */
  onChange: (value: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/** A small on/off switch used for opt-in settings (e.g. the drinking game). */
export function Switch({ checked, onChange, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-gradient-to-r from-primary to-secondary" : "bg-muted",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
