export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function parseScore(value?: string | null) {
  if (!value) return null;
  const parsed = parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function formatRole(role?: string | null) {
  if (role === "super_admin") return "Administrator";
  if (role === "admin") return "Admin";
  if (role === "reviewer") return "Reviewer";
  return role ? role.replace(/_/g, " ") : "Member";
}

export function formatRelativeTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatUpdatedSummary(value?: string | Date | null) {
  if (!value) return "No recent updates";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent updates";

  const diffMin = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMin < 15) return "Updated a few minutes ago";
  return `Updated ${formatRelativeTime(date)}`;
}

export function candidateMeta(degree?: string | null, board?: string | null) {
  return [degree, board].filter(Boolean).join(" · ");
}
