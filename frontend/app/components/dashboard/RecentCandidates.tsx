"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusLabel, ScoreValue } from "@/components/ui/status-label";
import { DataPanel, DataTable, DataTd, DataTh } from "@/components/ui/data-panel";
import { candidateMeta, formatRelativeTime, parseScore } from "@/lib/display";

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

const RecentCandidatesTable = ({
  limit = 5,
  onRowClick,
  candidates: profileCandidates,
  isLoading = false,
}: RecentCandidatesTableProps) => {
  const router = useRouter();
  const candidates = (profileCandidates || []).slice(0, limit);

  const openCandidate = (id: string | number) => {
    const candidateId = String(id);
    if (onRowClick) {
      onRowClick(candidateId);
      return;
    }
    router.push(`/candidate/${candidateId}`);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string | number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCandidate(id);
    }
  };

  return (
    <DataPanel>
      <DataTable>
        <thead>
          <tr>
            <DataTh className="w-[38%]">Candidate</DataTh>
            <DataTh className="w-[12%]">Score</DataTh>
            <DataTh className="w-[20%]">Status</DataTh>
            <DataTh className="w-[16%]">Last updated</DataTh>
            <DataTh className="w-[14%]" align="right">
              Action
            </DataTh>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            [0, 1, 2].map((row) => (
              <tr key={row}>
                <DataTd colSpan={5}>
                  <div className="h-10 rounded-lg bg-muted animate-pulse" />
                </DataTd>
              </tr>
            ))
          ) : candidates.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                No recent candidates yet.
              </td>
            </tr>
          ) : (
            candidates.map((candidate) => {
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
                  <DataTd>
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(candidate.updatedAt || candidate.createdAt || candidate.dateAdded)}
                    </span>
                  </DataTd>
                  <DataTd
                    align="right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => openCandidate(candidate.id)}
                    >
                      View
                    </Button>
                  </DataTd>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>
    </DataPanel>
  );
};

export default RecentCandidatesTable;
