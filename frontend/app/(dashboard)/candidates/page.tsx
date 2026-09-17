"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown, UserCheck, CheckCircle2, UserPlus } from "lucide-react";
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
  status: string;
  degree?: string | null;
  assignedReviewerId?: number | null;
  assignedReviewer?: {
    id: number;
    name: string | null;
    email?: string | null;
  } | null;
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

export default function CandidateDatabasePage() {
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
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
    const list = candidates.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        String(c.id).includes(search);
      const matchBoard = boardFilter === "all" || c.board === boardFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchBoard && matchStatus;
    });

    return list.sort((a, b) => {
      if (sortBy === "marks") return parseFloat(b.grade12) - parseFloat(a.grade12);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [candidates, search, boardFilter, statusFilter, sortBy]);

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

  return (
    <div className="space-y-6 fade-in">
      {/* Production Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userRole === "reviewer"
              ? "Review and evaluate your assigned candidate profiles."
              : "Manage candidate profiles, academic records, and evaluator assignments."}
          </p>
        </div>

        {isAdminOrSuper && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium gap-1.5 shrink-0 self-start sm:self-auto"
            onClick={() => router.push("/settings")}
          >
            <UserPlus className="w-3.5 h-3.5" /> Manage Team
          </Button>
        )}
      </div>

      {/* Assignment Success Toast Alert */}
      {assignSuccess ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 font-medium flex items-center gap-2.5 animate-in fade-in transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{assignSuccess}</span>
        </div>
      ) : null}

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <div className="flex gap-2">
          <Select value={boardFilter} onValueChange={setBoardFilter}>
            <SelectTrigger className="w-[130px] bg-card">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boards</SelectItem>
              {boards.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] bg-card">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="marks">By Marks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Candidate Cards List */}
      <div
        className="bg-card border border-border rounded-xl p-4 space-y-3"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-2 py-1 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-3">
          <span>Candidate Information</span>
          <span className="hidden md:inline">Evaluator Assignment</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Loading candidate directory...
          </div>
        ) : filtered.length === 0 ? (
          userRole === "reviewer" && candidates.length > 0 ? (
            <div className="py-16 text-center space-y-2">
              <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-foreground">No assigned candidates</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You currently have no candidate evaluations assigned to you. When an admin assigns a candidate, it will appear here.
              </p>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground">
              No candidates found matching your search.
            </div>
          )
        ) : (
          filtered.map((c) => {
            const status = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.pending;
            const assigned = c.assignedReviewer;

            return (
              <div
                key={c.id}
                className="p-4 rounded-lg border border-border/80 bg-background/50 hover:bg-background transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info */}
                <div
                  className="space-y-1.5 cursor-pointer flex-1"
                  onClick={() => router.push(`/candidate/${c.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {c.name}
                    </h3>
                    <span className={`status-badge ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.degree || "Degree —"} · Board:{" "}
                    <strong className="text-foreground/80">{c.board}</strong> · 10th:{" "}
                    <strong className="text-foreground/80">{c.grade10}%</strong> · 12th:{" "}
                    <strong className="text-foreground/80">{c.grade12}%</strong>
                  </p>
                </div>

                {/* Right: Evaluator Assignment & Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Assigned Evaluator
                    </span>
                    {assigned ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{assigned.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>

                  {isAdminOrSuper ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(c.assignedReviewerId || "")}
                        onValueChange={(val) => handleAssignReviewer(c.id, val)}
                        disabled={assigningId === c.id}
                      >
                        <SelectTrigger className="w-[170px] h-9 text-xs bg-card border-border">
                          <SelectValue placeholder="Assign Evaluator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableMembers.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              No evaluators found
                            </div>
                          ) : (
                            assignableMembers.map((m) => {
                              const uId = m.user?.id || m.userId;
                              const uName = m.user?.name || m.email || "Team Member";
                              const rawRole = m.role || "reviewer";
                              const displayRole = rawRole === "admin" ? "Admin" : "Reviewer";
                              return (
                                <SelectItem key={uId} value={String(uId)}>
                                  {uName} ({displayRole})
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs h-9"
                        onClick={() => router.push(`/candidate/${c.id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => router.push(`/candidate/${c.id}`)}
                    >
                      View Profile
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
