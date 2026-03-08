"use client";

import { useRouter } from "next/navigation";
import { mockCandidates, statusConfig } from "@/lib/mock-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentCandidatesTableProps {
  limit?: number;
  onRowClick?: (id: string) => void;
}

const RecentCandidatesTable = ({ limit = 5, onRowClick }: RecentCandidatesTableProps) => {
  const router = useRouter();
  const candidates = mockCandidates.slice(0, limit);

  const handleClick = (id: string) => {
    if (onRowClick) {
      onRowClick(id);
    } else {
      router.push(`/candidate/${id}`);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Board</TableHead>
            <TableHead className="font-semibold">Grade 12 %</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c) => {
            const status = statusConfig[c.status];
            return (
              <TableRow
                key={c.id}
                className="table-row-hover"
                onClick={() => handleClick(c.id)}
              >
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.board}</TableCell>
                <TableCell className="text-muted-foreground">{c.grade12}%</TableCell>
                <TableCell>
                  <span className={`status-badge ${status.className}`}>{status.label}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{c.dateAdded}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecentCandidatesTable;