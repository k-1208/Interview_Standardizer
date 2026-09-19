"use client";

import { useRouter } from "next/navigation";
import { statusConfig } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface RecentCandidate {
  id: string | number;
  name: string;
  board?: string;
  degree?: string | null;
  grade10?: string;
  grade12?: string;
  gpa?: string | null;
  status: string;
  dateAdded?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RecentCandidatesTableProps {
  limit?: number;
  onRowClick?: (id: string) => void;
  candidates?: RecentCandidate[];
  isLoading?: boolean;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const parseScore = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const statusTone = (status: string) => {
  if (status === "reviewed") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (status === "pending") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  if (status === "interviewing") return "text-violet-400 bg-violet-500/10 border-violet-500/30";
  return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
};

const RecentCandidatesTable = ({
  limit = 5,
  onRowClick,
  candidates: profileCandidates,
  isLoading = false,
}: RecentCandidatesTableProps) => {
  const router = useRouter();
  const candidates = (profileCandidates || []).slice(0, limit);

  const handleClick = (id: string | number) => {
    const candidateId = String(id);
    if (onRowClick) {
      onRowClick(candidateId);
      return;
    }
    router.push(`/candidate/${candidateId}`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "0 24px 70px rgba(0,0,0,.18)" }}>
      <table className="w-full table-fixed border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-[44%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              Candidate
            </th>
            <th className="w-[12%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              Score
            </th>
            <th className="w-[22%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              Status
            </th>
            <th className="w-[22%] bg-card text-right px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [0, 1, 2].map((row) => (
              <tr key={row}>
                <td colSpan={4} className="px-3 py-3 border-b border-border/70">
                  <div className="h-10 rounded-lg bg-muted/60 animate-pulse" />
                </td>
              </tr>
            ))
          ) : candidates.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-16 text-center text-[13px] text-muted-foreground">
                No recent candidates yet.
              </td>
            </tr>
          ) : (
            candidates.map((c) => {
              const status = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.pending;
              const score = parseScore(c.grade12) ?? parseScore(c.gpa);
              const meta = [c.degree, c.board].filter(Boolean).join(" · ");

              return (
                <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-2.5 border-b border-border/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {meta || "Degree not specified"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-border/70">
                    {score === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="font-bold text-foreground">
                        {score}
                        <small className="ml-0.5 text-[10px] font-semibold text-muted-foreground">/100</small>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 border-b border-border/70">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap",
                        statusTone(c.status)
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 border-b border-border/70 text-right">
                    <button
                      type="button"
                      className="h-8 px-2.5 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted"
                      onClick={() => handleClick(c.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
};

export default RecentCandidatesTable;
