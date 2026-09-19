"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, CheckCircle2, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusConfig } from "@/lib/mock-data";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getCandidates, assignReviewer } from "@/api/candidate";
import { getProfile } from "@/api/user";

type CandidateRecord = {
  id: number;
  name: string;
  board: string;
  grade10: string;
  grade12: string;
  gpa?: string | null;
  status: string;
  degree?: string | null;
  assignedReviewerId?: number | null;
  assignedReviewer?: {
    id: number;
    name: string | null;
    email?: string | null;
  } | null;
  createdAt?: string;
  updatedAt: string;
};

type WorkspaceMember = {
  role?: string;
  userId?: number;
  email?: string;
  user?: {
    id?: number;
    name?: string | null;
    email?: string | null;
  };
};

const PAGE_SIZE = 10;

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const formatRole = (role: string) => {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Reviewer";
};

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

export default function CandidateDatabasePage() {
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [userRole, setUserRole] = useState<string>("reviewer");
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string>("");

  useEffect(() => {
    const workspaceId = Number(selectedWorkspaceId);
    if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [candidateResult, profileResult] = await Promise.allSettled([
          getCandidates(workspaceId),
          getProfile(workspaceId),
        ]);

        if (!isMounted) return;

        if (candidateResult.status === "fulfilled") {
          const data = candidateResult.value;
          setCandidates(data.candidates || []);
          if (data.userRole) {
            setUserRole(data.userRole);
          }
        } else {
          console.error("[candidates] failed to load candidates", candidateResult.reason);
          setCandidates([]);
        }

        if (profileResult.status === "fulfilled") {
          const data = profileResult.value;
          const role = data?.membership?.role || data?.position?.role;
          setWorkspaceMembers(Array.isArray(data?.organizationUsers) ? data.organizationUsers : []);
          if (role) {
            setUserRole(role);
          }
        } else {
          console.error("[candidates] failed to load profile", profileResult.reason);
          setWorkspaceMembers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

  const isAdminOrSuper = useMemo(() => {
    return ["super_admin", "admin"].includes(userRole);
  }, [userRole]);

  const assignableMembers = useMemo(() => {
    return workspaceMembers.filter((member) => {
      const role = member.role || "reviewer";
      const userId = member.user?.id || member.userId;
      return userId && ["super_admin", "admin", "reviewer"].includes(role);
    });
  }, [workspaceMembers]);

  const handleAssignReviewer = async (candidateId: number, reviewerIdValue: string) => {
    const workspaceId = Number(selectedWorkspaceId);
    const reviewerId = Number(reviewerIdValue);
    if (!Number.isFinite(workspaceId) || workspaceId <= 0 || !Number.isFinite(reviewerId)) {
      return;
    }

    setAssignSuccess("");
    setAssigningId(candidateId);

    try {
      await assignReviewer(candidateId, workspaceId, reviewerId);

      const assignedMember = assignableMembers.find((member) => {
        const memberUserId = member.user?.id || member.userId;
        return Number(memberUserId) === reviewerId;
      });
      const assignedReviewer = assignedMember
        ? {
            id: reviewerId,
            name: assignedMember.user?.name || assignedMember.email || "Team Member",
            email: assignedMember.user?.email || assignedMember.email,
          }
        : null;

      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, assignedReviewerId: reviewerId, assignedReviewer }
            : candidate
        )
      );
      setAssignSuccess("Evaluator assigned successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign evaluator";
      console.error("[candidates] failed to assign reviewer", error);
      setAssignSuccess(message);
    } finally {
      setAssigningId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = candidates.filter((c) => {
      const haystack = `${c.name} ${c.degree || ""} ${c.board || ""} ${c.assignedReviewer?.name || ""}`.toLowerCase();
      const matchSearch = !query || haystack.includes(query) || String(c.id).includes(query);
      const matchBoard = boardFilter === "all" || c.board === boardFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchBoard && matchStatus;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "score") return (parseScore(b.grade12) || 0) - (parseScore(a.grade12) || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [candidates, search, boardFilter, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, boardFilter, statusFilter, sortBy, selectedWorkspaceId]);

  const boards = useMemo(
    () => [
      ...new Set(
        candidates
          .map((c) => c.board)
          .filter((board) => typeof board === "string" && board.trim().length > 0)
      ),
    ],
    [candidates]
  );

  const pageButtons = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, safePage - 2);
    let end = Math.min(pageCount, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, pageCount]);

  const from = filtered.length ? pageStart + 1 : 0;
  const to = Math.min(pageStart + PAGE_SIZE, filtered.length);

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {userRole === "reviewer"
              ? "Review and evaluate your assigned candidate profiles."
              : "Manage profiles, academic records, evaluation status and reviewer assignments."}
          </p>
        </div>
        {isAdminOrSuper ? (
          <Button className="h-10 px-3.5 rounded-[10px] font-semibold shrink-0 self-start" onClick={() => router.push("/upload")}>
            <Plus className="w-4 h-4" /> Add candidate
          </Button>
        ) : null}
      </div>

      {assignSuccess ? (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "0 24px 70px rgba(0,0,0,.18)" }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3.5 sm:px-4 border-b border-border/80">
          <div className="relative w-full lg:max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search candidate, degree, board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[38px] pl-9 bg-background border-border"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-[38px] w-[150px] bg-background border-border text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger className="h-[38px] w-[130px] bg-background border-border text-xs">
                <SelectValue placeholder="Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                {boards.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-[38px] w-[150px] bg-background border-border text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest first</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="score">Score high–low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-border/80 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">
            {filtered.length} candidate{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-y-auto max-h-[67vh]">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-[36%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Candidate
                </th>
                <th className="sticky top-0 z-10 w-[12%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Score
                </th>
                <th className="sticky top-0 z-10 w-[18%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Status
                </th>
                <th className="sticky top-0 z-10 w-[22%] bg-card text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Evaluator
                </th>
                <th className="sticky top-0 z-10 w-[12%] bg-card text-right px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [0, 1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td colSpan={5} className="px-3 py-3 border-b border-border/70">
                      <div className="h-10 rounded-lg bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-[70px] text-center text-[13px] text-muted-foreground">
                    {userRole === "reviewer" && candidates.length > 0 ? (
                      <div className="space-y-2">
                        <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                        <p className="text-sm font-medium text-foreground">No assigned candidates</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          You currently have no candidate evaluations assigned to you.
                        </p>
                      </div>
                    ) : (
                      "No candidates match the current filters."
                    )}
                  </td>
                </tr>
              ) : (
                pageItems.map((c) => {
                  const status = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.pending;
                  const score = parseScore(c.grade12) ?? parseScore(c.gpa);
                  const assigned = c.assignedReviewer;
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
                      <td className="px-3 py-2.5 border-b border-border/70">
                        {isAdminOrSuper ? (
                          <Select
                            value={c.assignedReviewerId ? String(c.assignedReviewerId) : undefined}
                            onValueChange={(val) => handleAssignReviewer(c.id, val)}
                            disabled={assigningId === c.id}
                          >
                            <SelectTrigger className="h-8 w-full max-w-[180px] text-xs bg-background border-border [&>span]:truncate">
                              <SelectValue placeholder="Assign evaluator" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableMembers.length === 0 ? (
                                <div className="p-2 text-xs text-muted-foreground text-center">No evaluators found</div>
                              ) : (
                                assignableMembers.map((m) => {
                                  const uId = m.user?.id || m.userId;
                                  const uName = m.user?.name || m.email || "Team Member";
                                  return (
                                    <SelectItem key={uId} value={String(uId)}>
                                      {uName}
                                      <span className="text-muted-foreground"> · {formatRole(m.role || "reviewer")}</span>
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground truncate block">
                            {assigned?.name || "Unassigned"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 border-b border-border/70 text-right">
                        <button
                          type="button"
                          className="h-8 px-2.5 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted"
                          onClick={() => router.push(`/candidate/${c.id}`)}
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
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 px-4 py-3 border-t border-border/80 bg-background/40">
          <p className="text-xs text-muted-foreground">
            Showing {from}–{to} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="min-w-8 h-8 px-2 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-45"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            {pageButtons.map((page) => (
              <button
                key={page}
                type="button"
                className={cn(
                  "min-w-8 h-8 px-2 rounded-lg border text-xs",
                  page === safePage
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="min-w-8 h-8 px-2 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-45"
              disabled={safePage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
