import { cn } from "@client/lib/utils";

export type SegmentedOption = {
  value: string;
  label: string;
};

type SegmentedToggleProps = {
  label: string;
  value: string;
  options: readonly SegmentedOption[];
  onChange: (value: string) => void;
};

export function SegmentedToggle({
  label,
  value,
  options,
  onChange,
}: SegmentedToggleProps) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-label`;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium" id={labelId}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="border-border bg-muted/40 flex rounded-lg border p-0.5"
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              className={cn(
                "flex-1 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
