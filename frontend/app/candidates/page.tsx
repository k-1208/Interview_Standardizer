"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockCandidates, statusConfig, CandidateProfile } from "@/lib/mock-data";
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

  let filtered = mockCandidates.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search);
    const matchBoard = boardFilter === "all" || c.board === boardFilter;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchBoard && matchStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "marks") return parseFloat(b.grade12) - parseFloat(a.grade12);
    return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
  });

  const boards = [...new Set(mockCandidates.map((c) => c.board))];

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
            {filtered.map((c) => {
              const status = statusConfig[c.status];
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
                  <TableCell className="text-muted-foreground text-xs font-mono">{c.dateAdded}</TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
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
