"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { sendInterviewBot } from "@/api/ai";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DataPanel } from "@/components/ui/data-panel";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusLabel } from "@/components/ui/status-label";
import { candidateMeta } from "@/lib/display";

const academicOrder = ["9th", "10th", "11th", "12th"];
const academicLabel = (standard: string) => standard || "Academic record";
const examLabel = (examName: string) => examName || "Competitive exam";

function ProfileSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DataPanel className={className}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </DataPanel>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <EmptyText>{empty}</EmptyText>;

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="text-sm text-foreground flex items-start gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspace();
  const [candidateData, setCandidateData] = useState<CandidateDetailResponse["candidate"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedExamIds, setExpandedExamIds] = useState<number[]>([]);
  const [selectedAcademicId, setSelectedAcademicId] = useState<number | null>(null);
  const [showBotModal, setShowBotModal] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botName, setBotName] = useState("Plaksha Interview Bot");
  const [botError, setBotError] = useState("");
  const [botSuccess, setBotSuccess] = useState("");
  const [isSendingBot, setIsSendingBot] = useState(false);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const loadCandidate = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getCandidateById(Number(id), selectedWorkspaceId);
        setCandidateData(data.candidate);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load candidate";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, [id, selectedWorkspaceId]);

  const candidate = candidateData;
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
      <div className="space-y-5 fade-in">
        <div className="h-8 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-36 rounded-2xl bg-card border border-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-72 rounded-2xl bg-card border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="space-y-4 fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.push("/candidates")} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to candidates
        </Button>
        <DataPanel className="p-6 text-sm text-muted-foreground">{error || "Candidate not found"}</DataPanel>
      </div>
    );
  }

  const meta = candidateMeta(candidate.degree, candidate.board);
  const insights =
    candidate.aiSummary?.keyInsights && candidate.aiSummary.keyInsights.length > 0
      ? candidate.aiSummary.keyInsights
      : candidate.strengths;
  const growth =
    candidate.aiSummary?.growthAreas && candidate.aiSummary.growthAreas.length > 0
      ? candidate.aiSummary.growthAreas
      : candidate.growthAreas;
  const selectedRecord = academicRecords.find((record) => record.id === selectedAcademicId);

  return (
    <div className="space-y-5 fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.push("/candidates")} className="gap-1.5 text-muted-foreground -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to candidates
      </Button>

      <DataPanel>
        <div className="p-5 flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <InitialsAvatar name={candidate.name} size="md" className="h-12 w-12 text-sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">{candidate.name}</h1>
                  <StatusLabel status={candidate.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {[meta, candidate.gpa ? `GPA ${candidate.gpa}` : null].filter(Boolean).join(" · ") || "Profile details unavailable"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{candidate.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={() => router.push(`/candidate/${id}/questions?generate=1`)} className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> Generate questions
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBotError("");
                setBotSuccess("");
                setShowBotModal(true);
              }}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Send bot
            </Button>
            <Button variant="outline" onClick={() => router.push(`/candidate/${id}/analysis`)} className="gap-1.5">
              <ClipboardList className="w-4 h-4" /> Interview analysis
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/candidate/${id}/history`)} className="gap-1.5">
              <History className="w-4 h-4" /> History
            </Button>
            <Button variant="ghost" onClick={() => router.push("/export")} className="gap-1.5">
              <FileDown className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>
      </DataPanel>

      <ProfileSection title="Academic performance" icon={GraduationCap}>
        {academicRecords.length === 0 ? (
          <EmptyText>No academic records found.</EmptyText>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {academicRecords.map((record) => {
              const isSelected = selectedAcademicId === record.id;
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedAcademicId(isSelected ? null : record.id)}
                  className={`rounded-xl bg-muted p-4 text-left transition-colors ${
                    isSelected ? "ring-1 ring-border" : "hover:bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{academicLabel(record.standard)}</p>
                    {isSelected ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-foreground mt-3">
                    {record.obtainedPercentageOrCgpa || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{record.markingScheme || "Score"}</p>
                </button>
              );
            })}
          </div>
        )}

        {selectedRecord ? (
          <div className="mt-4 rounded-xl bg-muted p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {academicLabel(selectedRecord.standard)}
                  {selectedRecord.schoolName ? ` · ${selectedRecord.schoolName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[selectedRecord.board, selectedRecord.yearOfPassing, selectedRecord.markingScheme]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAcademicId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            {selectedRecord.subjects.length === 0 ? (
              <EmptyText>No subject breakdown available.</EmptyText>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium w-10">#</th>
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium">Maximum</th>
                    <th className="pb-2 font-medium">Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.subjects.map((subject, index) => (
                    <tr key={subject.id} className="border-t border-border/70">
                      <td className="py-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-2 text-foreground">{subject.subject}</td>
                      <td className="py-2 text-muted-foreground">{subject.maximumMarksOrGrade}</td>
                      <td className="py-2 text-foreground font-medium">{subject.obtainedMarksOrGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </ProfileSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProfileSection title="Competitive exams" icon={ClipboardList}>
          {candidate.competitiveExams.length === 0 ? (
            <EmptyText>No competitive exam records found.</EmptyText>
          ) : (
            <div className="space-y-3">
              {candidate.competitiveExams.map((exam) => {
                const isExpanded = expandedExamIds.includes(exam.id);
                return (
                  <div key={exam.id} className="rounded-xl bg-muted overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExamRecord(exam.id)}
                      className="w-full p-4 text-left flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{examLabel(exam.examName)}</p>
                        <p className="text-lg font-semibold text-foreground mt-1">{exam.totalScore || "—"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{exam.status || "Status unavailable"}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground mt-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5" />
                      )}
                    </button>
                    {isExpanded ? (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            ["Status", exam.status],
                            ["Result", exam.result],
                            ["Test date", exam.testDate],
                            ["Roll number", exam.rollNumber],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="mt-0.5 text-foreground">{value || "—"}</p>
                            </div>
                          ))}
                        </div>
                        {exam.sectionScores.length > 0 ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                <th className="pb-2 font-medium">Section</th>
                                <th className="pb-2 font-medium">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exam.sectionScores.map((section) => (
                                <tr key={section.id} className="border-t border-border/70">
                                  <td className="py-2 text-foreground">{section.section}</td>
                                  <td className="py-2 text-foreground">{section.score}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="AI summary" icon={Sparkles}>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {candidate.aiSummary?.summary || candidate.summary || "No summary available yet."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Key insights</h4>
              <BulletList items={insights} empty="No insights yet." />
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Growth areas</h4>
              <BulletList items={growth} empty="No growth areas yet." />
            </div>
          </div>
        </ProfileSection>

        <ProfileSection title="Activities & leadership" icon={Trophy}>
          <BulletList items={candidate.activities} empty="No activities listed." />
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-5 mb-2">Achievements</h4>
          <BulletList items={candidate.achievements} empty="No achievements listed." />
        </ProfileSection>

        <ProfileSection title="Technical skills" icon={Code2}>
          {candidate.skills.length === 0 ? (
            <EmptyText>No skills listed.</EmptyText>
          ) : (
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </ProfileSection>
      </div>

      <ProfileSection title="Essays & key themes" icon={BookOpen}>
        {(candidate.essays ?? []).length === 0 ? (
          <EmptyText>No essays found.</EmptyText>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(candidate.essays ?? []).map((essay) => (
              <div key={essay.id || essay.title} className="rounded-xl bg-muted p-4">
                <p className="text-sm font-semibold text-foreground mb-2">{essay.title}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{essay.content}</p>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      {showBotModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Send bot to meeting</h3>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowBotModal(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste a meeting URL and we will dispatch the bot to join and capture the transcript.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-foreground">Meeting URL</p>
                <input
                  type="url"
                  placeholder="https://zoom.us/j/123..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Bot name</p>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                />
              </div>
            </div>
            {botError ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {botError}
              </div>
            ) : null}
            {botSuccess ? (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                {botSuccess}
              </div>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowBotModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSendingBot}
                onClick={async () => {
                  if (!meetingUrl) {
                    setBotError("Meeting URL is required");
                    return;
                  }
                  try {
                    setBotError("");
                    setBotSuccess("");
                    setIsSendingBot(true);
                    await sendInterviewBot({
                      meetingUrl,
                      candidateId: Number(id),
                      botName: botName.trim() || undefined,
                    });
                    setBotSuccess("Bot is on the way to the meeting.");
                    setMeetingUrl("");
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to send bot";
                    setBotError(message);
                  } finally {
                    setIsSendingBot(false);
                  }
                }}
              >
                {isSendingBot ? "Sending..." : "Send bot"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
