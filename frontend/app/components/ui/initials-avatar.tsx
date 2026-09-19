import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/display";

type InitialsAvatarProps = {
  name: string;
  size?: "sm" | "md";
  className?: string;
};

const sizeClass = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-xs",
};

export function InitialsAvatar({ name, size = "sm", className }: InitialsAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-muted text-foreground font-semibold flex items-center justify-center shrink-0 ring-1 ring-border",
        sizeClass[size],
        className
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}
