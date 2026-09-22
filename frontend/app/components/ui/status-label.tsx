import { cn } from "@/lib/utils";
import { statusConfig } from "@/lib/mock-data";

type StatusLabelProps = {
  status: string;
  className?: string;
};

export function StatusLabel({ status, className }: StatusLabelProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] whitespace-nowrap", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      <span className="text-foreground/80">{config.label}</span>
    </span>
  );
}

export function ScoreValue({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-semibold tabular-nums text-foreground">
      {score}
      <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">/100</span>
    </span>
  );
}
