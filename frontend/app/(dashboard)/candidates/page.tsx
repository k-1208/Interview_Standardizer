"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, CheckCircle2, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPanel, DataTable, DataTd, DataTh } from "@/components/ui/data-panel";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusLabel, ScoreValue } from "@/components/ui/status-label";
import { statusConfig } from "@/lib/mock-data";
import {
  candidateMeta,
  formatRelativeTime,
  formatRole,
  formatUpdatedSummary,
  parseScore,
} from "@/lib/display";
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
const filterTriggerClass =
  "h-10 w-[148px] rounded-full bg-background border-border text-xs font-medium shadow-none";

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

  const isAdminOrSuper = useMemo(() => ["super_admin", "admin"].includes(userRole), [userRole]);

  const assignableMembers = useMemo(() => {
    return workspaceMembers.filter((member) => {
      const role = member.role || "reviewer";
      const userId = member.user?.id || member.userId;
      return userId && ["super_admin", "admin", "reviewer"].includes(role);
    });
  }, [workspaceMembers]);

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>();
    for (const member of assignableMembers) {
      const userId = Number(member.user?.id || member.userId);
      if (Number.isFinite(userId)) map.set(userId, member);
    }
    return map;
  }, [assignableMembers]);

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

      const assignedMember = memberById.get(reviewerId);
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
      setAssignSuccess("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't assign evaluator. Please try again.";
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

  const latestUpdatedAt = filtered[0]?.updatedAt || filtered[0]?.createdAt;
  const from = filtered.length ? pageStart + 1 : 0;
  const to = Math.min(pageStart + PAGE_SIZE, filtered.length);

  const openCandidate = (id: number) => {
    router.push(`/candidate/${id}`);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCandidate(id);
    }
  };

  const renderEvaluator = (candidate: CandidateRecord) => {
    const assigned = candidate.assignedReviewer;
    const assignedMember = assigned?.id ? memberById.get(assigned.id) : undefined;
    const assignedName = assigned?.name || "Unassigned";
    const assignedRole = formatRole(assignedMember?.role || "reviewer");

    if (!isAdminOrSuper) {
      if (!assigned) return <span className="text-sm text-muted-foreground">Unassigned</span>;
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <InitialsAvatar name={assignedName} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {assignedName}
              <span className="ml-1.5 font-normal text-muted-foreground">· {assignedRole}</span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <Select
        value={candidate.assignedReviewerId ? String(candidate.assignedReviewerId) : undefined}
        onValueChange={(val) => handleAssignReviewer(candidate.id, val)}
        disabled={assigningId === candidate.id}
      >
        <SelectTrigger className="h-auto w-full max-w-[220px] border-0 bg-transparent shadow-none px-0 py-0 focus:ring-0 [&>svg]:text-muted-foreground/70">
          {assigned ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <InitialsAvatar name={assignedName} />
              <span className="text-sm font-medium text-foreground truncate">
                {assignedName}
                <span className="ml-1.5 font-normal text-muted-foreground">· {assignedRole}</span>
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Assign evaluator</span>
          )}
        </SelectTrigger>
        <SelectContent>
          {assignableMembers.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground text-center">No evaluators found</div>
          ) : (
            assignableMembers.map((member) => {
              const userId = member.user?.id || member.userId;
              const name = member.user?.name || member.email || "Team Member";
              return (
                <SelectItem key={userId} value={String(userId)}>
                  {name}
                  <span className="text-muted-foreground"> · {formatRole(member.role || "reviewer")}</span>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Admissions</p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground mt-1">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {userRole === "reviewer"
              ? "Review and evaluate your assigned candidate profiles."
              : "Manage applications, review progress, and evaluator assignments."}
          </p>
        </div>
        {isAdminOrSuper ? (
          <Button
            className="h-10 px-4 rounded-full font-medium shrink-0 self-start bg-foreground text-background hover:bg-foreground/90"
            onClick={() => router.push("/upload")}
          >
            <Plus className="w-4 h-4" /> Add candidate
          </Button>
        ) : null}
      </div>

      {assignSuccess ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      ) : null}

      <DataPanel>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:px-4">
          <div className="relative w-full lg:max-w-[420px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, degree, board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 rounded-full bg-background border-border shadow-none"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={filterTriggerClass}>
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
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                {boards.map((board) => (
                  <SelectItem key={board} value={board}>
                    {board}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={filterTriggerClass}>
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

        <div className="px-4 pb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {` candidate${filtered.length === 1 ? "" : "s"} in this view`}
          </p>
          <p>{formatUpdatedSummary(latestUpdatedAt)}</p>
        </div>

        <DataTable>
          <thead>
            <tr>
              <DataTh className="w-[34%]">Candidate</DataTh>
              <DataTh className="w-[12%]">Score</DataTh>
              <DataTh className="w-[18%]">Status</DataTh>
              <DataTh className="w-[24%]">Evaluator</DataTh>
              <DataTh className="w-[12%]" align="right">
                Updated
              </DataTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [0, 1, 2, 3, 4].map((row) => (
                <tr key={row}>
                  <DataTd colSpan={5}>
                    <div className="h-10 rounded-lg bg-muted animate-pulse" />
                  </DataTd>
                </tr>
              ))
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center text-sm text-muted-foreground">
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
              pageItems.map((candidate) => {
                const score = parseScore(candidate.grade12) ?? parseScore(candidate.gpa);
                const meta = candidateMeta(candidate.degree, candidate.board);

                return (
                  <tr
                    key={candidate.id}
                    tabIndex={0}
                    onClick={() => openCandidate(candidate.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, candidate.id)}
                    className="cursor-pointer hover:bg-muted/60 transition-colors outline-none focus-visible:bg-muted/60"
                  >
                    <DataTd>
                      <div className="flex items-center gap-3 min-w-0">
                        <InitialsAvatar name={candidate.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {meta || "Degree not specified"}
                          </p>
                        </div>
                      </div>
                    </DataTd>
                    <DataTd>
                      <ScoreValue score={score} />
                    </DataTd>
                    <DataTd>
                      <StatusLabel status={candidate.status} />
                    </DataTd>
                    <DataTd
                      onClick={(event) => {
                        if (isAdminOrSuper) event.stopPropagation();
                      }}
                      onKeyDown={(event) => {
                        if (isAdminOrSuper) event.stopPropagation();
                      }}
                    >
                      {renderEvaluator(candidate)}
                    </DataTd>
                    <DataTd align="right">
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(candidate.updatedAt || candidate.createdAt)}
                      </span>
                    </DataTd>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {from}–{to} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="min-w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-40"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <span className="min-w-8 h-8 rounded-lg border border-border bg-muted text-foreground text-xs font-medium flex items-center justify-center">
              {safePage}
            </span>
            <button
              type="button"
              className="min-w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-40"
              disabled={safePage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      </DataPanel>
    </div>
  );
}
