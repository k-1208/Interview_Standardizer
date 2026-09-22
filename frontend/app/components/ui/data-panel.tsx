import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type DataPanelProps = {
  children: ReactNode;
  className?: string;
};

export function DataPanel({ children, className }: DataPanelProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-card)]", className)}>
      {children}
    </section>
  );
}

export function DataTable({ children, className }: DataPanelProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full table-fixed border-separate border-spacing-0">{children}</table>
    </div>
  );
}

export function DataTh({
  children,
  className,
  align = "left",
  ...props
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
} & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground border-b border-border",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function DataTd({
  children,
  className,
  align = "left",
  ...props
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
} & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 border-b border-border/70 text-sm",
        align === "right" ? "text-right" : "text-left",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
