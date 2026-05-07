"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  GraduationCap,
  Code2,
  Sparkles,
  MessageSquare,
  History,
  FileDown,
  BookOpen,
  Trophy,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { getCandidateById, type CandidateDetailResponse } from "@/api/candidate";

const SELECTED_WORKSPACE_KEY = "selected_workspace_id";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-800" },
  reviewed: { label: "Interview Ready", className: "bg-green-100 text-green-800" },
  interviewing: { label: "Interviewing", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-slate-100 text-slate-800" },
};

const academicOrder = ["9th", "10th", "11th", "12th"];

const academicLabel = (standard: string) => standard || "Academic Record";

const examLabel = (examName: string) => examName || "Competitive Exam";



export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidateData, setCandidateData] = useState<CandidateDetailResponse['candidate'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedExamIds, setExpandedExamIds] = useState<number[]>([]);
  const [selectedAcademicId, setSelectedAcademicId] = useState<number | null>(null);

  useEffect(() => {
    const loadCandidate = async () => {
      try {
        setLoading(true);
        setError("");

        const workspaceIdValue = window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
        const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : NaN;

        if (!workspaceId || Number.isNaN(workspaceId)) {
          throw new Error("Workspace not selected");
        }

        const data = await getCandidateById(Number(id), workspaceId);
        console.log("Fetched candidate data:", data);
        setCandidateData(data.candidate);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load candidate";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, [id]);

  const candidate = candidateData;
  const status = candidate ? statusConfig[candidate.status] : statusConfig.pending;
  const academicRecords = useMemo(() => {
    if (!candidate) return [];

    return [...candidate.academicRecords].sort((left, right) => {
      const leftIndex = academicOrder.indexOf(left.standard);
      const rightIndex = academicOrder.indexOf(right.standard);

      if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
      if (leftIndex !== -1) return -1;
      if (rightIndex !== -1) return 1;
      return left.standard.localeCompare(right.standard);
    });
  }, [candidate]);

  const toggleExamRecord = (examId: number) => {
    setExpandedExamIds((current) =>
      current.includes(examId) ? current.filter((idValue) => idValue !== examId) : [...current, examId]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-10 w-44 rounded-md bg-secondary animate-pulse" />
        <div className="h-32 rounded-xl bg-card border border-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-80 rounded-xl bg-card border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="space-y-4 fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.push("/candidates")} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Database
        </Button>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {error || "Candidate not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/candidates")} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Database
      </Button>

      {/* Profile Summary Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start gap-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
          {candidate.name.split(" ").map((namePart: string) => namePart[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-foreground">{candidate.name}</h2>
            <span className={`status-badge ${status.className}`}>{status.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{candidate.degree} · {candidate.board} · GPA {candidate.gpa}</p>
          <p className="text-xs text-muted-foreground mt-1">{candidate.email}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button onClick={() => router.push(`/candidate/${id}/questions?generate=1`)} className="gap-1.5">
            <MessageSquare className="w-4 h-4" /> Generate Questions
          </Button>
          <Button variant="outline" onClick={() => router.push(`/candidate/${id}/history`)} className="gap-1.5">
            <History className="w-4 h-4" /> History
          </Button>
          <Button variant="outline" onClick={() => router.push("/export")} className="gap-1.5">
            <FileDown className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Academic Performance - Full Width */}
      <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-primary" /> Academic Performance
        </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {academicRecords.map((record) => {
              const isSelected = selectedAcademicId === record.id;

              return (
                <div key={record.id} className="rounded-lg border border-border/50 bg-secondary/35 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedAcademicId(isSelected ? null : record.id)}
                    className="w-full p-4 text-left flex flex-col gap-2 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{academicLabel(record.standard)}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs font-medium">View</span>
                        {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{record.obtainedPercentageOrCgpa}</p>
                      <p className="text-xs text-muted-foreground mt-1">{record.markingScheme}</p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Full-width detailed table for selected record */}
          {selectedAcademicId ? (
            <div className="mt-4 rounded-md border border-border/60 bg-card p-4 shadow-sm overflow-x-auto">
              {(() => {
                const rec = academicRecords.find((r) => r.id === selectedAcademicId);
                if (!rec) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{academicLabel(rec.standard)} — {rec.schoolName}</p>
                        <p className="text-xs text-muted-foreground">{rec.board} · {rec.yearOfPassing} · {rec.markingScheme}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAcademicId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Close
                      </button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">#</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Maximum Marks/Grade</TableHead>
                          <TableHead>Obtained Marks/Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rec.subjects.map((subject, idx) => (
                          <TableRow key={subject.id} className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}>
                            <TableCell className="pl-4 text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-foreground">{subject.subject}</TableCell>
                            <TableCell className="text-muted-foreground">{subject.maximumMarksOrGrade}</TableCell>
                            <TableCell className="text-foreground font-semibold">{subject.obtainedMarksOrGrade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </section>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Competitive Exams */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" /> Competitive Exams
            </h3>
            <div className="space-y-3">
              {candidate.competitiveExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No competitive exam records found.</p>
              ) : (
                candidate.competitiveExams.map((exam) => {
                  const isExpanded = expandedExamIds.includes(exam.id);

                  return (
                    <div key={exam.id} className="rounded-lg border border-border/50 bg-secondary/35 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleExamRecord(exam.id)}
                        className="w-full p-3 text-left flex items-start justify-between gap-3 hover:bg-secondary/60 transition-colors"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground">{examLabel(exam.examName)}</p>
                          <p className="text-lg font-semibold text-foreground">{exam.totalScore || "-"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{exam.status || "Status unavailable"}</p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                          <span className="text-xs font-medium">Details</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-border/50 p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <p className="font-medium text-foreground">{exam.status || "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Result</p>
                              <p className="font-medium text-foreground">{exam.result || "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Test Date</p>
                              <p className="font-medium text-foreground">{exam.testDate || "-"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Roll Number</p>
                              <p className="font-medium text-foreground">{exam.rollNumber || "-"}</p>
                            </div>
                          </div>

                          <div className="rounded-md border border-border/60 bg-card">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="pl-4">Section</TableHead>
                                  <TableHead>Score</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.sectionScores.map((section) => (
                                  <TableRow key={section.id}>
                                    <TableCell className="pl-4 font-medium text-foreground">{section.section}</TableCell>
                                    <TableCell className="text-foreground">{section.score}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Activities & Leadership */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-yellow-500" /> Activities & Leadership
            </h3>
            <ul className="space-y-2 mb-4">
              {candidate.activities.map((a, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Achievements</h4>
            <ul className="space-y-2">
              {candidate.achievements.map((a, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Summary */}
          <section className="bg-card border border-border border-l-4 border-l-yellow-400 rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-yellow-500" /> AI Summary
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">{candidate.aiSummary?.summary ?? candidate.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-green-600 mb-2">Key Insights</h4>
                <ul className="space-y-1.5">
                  {(candidate.aiSummary?.keyInsights && candidate.aiSummary.keyInsights.length > 0
                    ? candidate.aiSummary.keyInsights
                    : candidate.strengths
                  ).map((s, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-yellow-600 mb-2">Growth Areas</h4>
                <ul className="space-y-1.5">
                  {(candidate.aiSummary?.growthAreas && candidate.aiSummary.growthAreas.length > 0
                    ? candidate.aiSummary.growthAreas
                    : candidate.growthAreas
                  ).map((g, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Skills */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Code2 className="w-4 h-4 text-primary" /> Technical Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Essays & Key Themes - Full Width */}
      <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-primary" /> Essays & Key Themes
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(candidate.essays ?? []).map((essay, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-secondary/35 p-4">
              <p className="text-sm font-semibold text-foreground mb-2">{essay.title}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{essay.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
