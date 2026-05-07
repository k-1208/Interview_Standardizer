"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusConfig } from "@/lib/mock-data";
import { getProfile } from "@/api/user";
import { getCandidates } from "@/api/candidate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CandidateDatabasePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCandidates = async () => {
      try {
        const profile = await getProfile();
        const workspaceId =
          profile?.workspace?.id ||
          profile?.membership?.workspace?.id ||
          profile?.position?.workspace?.id;

        if (!workspaceId) {
          throw new Error("Workspace not found for user");
        }

        const data = await getCandidates(workspaceId);
        if (isMounted) {
          setCandidates(data.candidates || []);
        }
      } catch (error) {
        console.error("[candidates] failed to load candidates", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, []);

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
    () => [...new Set(candidates.map((c) => c.board).filter((board) => typeof board === "string" && board.trim().length > 0))],
    [candidates]
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
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
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] bg-card">
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

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Candidate Name</TableHead>
              <TableHead className="font-semibold">Education Board</TableHead>
              <TableHead className="font-semibold">Grade 10 %</TableHead>
              <TableHead className="font-semibold">Grade 12 %</TableHead>
              <TableHead className="font-semibold">Interview Status</TableHead>
              <TableHead className="font-semibold">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading candidates...
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const status = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <TableRow
                    key={c.id}
                    className="table-row-hover"
                    onClick={() => router.push(`/candidate/${c.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.board}</TableCell>
                    <TableCell className="text-muted-foreground">{c.grade10}%</TableCell>
                    <TableCell className="text-muted-foreground">{c.grade12}%</TableCell>
                    <TableCell>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {new Date(c.updatedAt).toISOString().slice(0, 10)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No candidates match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
