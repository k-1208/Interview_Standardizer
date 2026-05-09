"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCandidateById, getCandidateTranscriptAnalysis, type TranscriptAnalysisItem } from "@/api/candidate";

const SELECTED_WORKSPACE_KEY = "selected_workspace_id";

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function InterviewAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [analysis, setAnalysis] = useState<TranscriptAnalysisItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true);
        setError("");

        const workspaceIdValue = window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
        const workspaceId = workspaceIdValue ? Number(workspaceIdValue) : NaN;

        if (!workspaceId || Number.isNaN(workspaceId)) {
          throw new Error("Workspace not selected");
        }

        const [candidateData, analysisData] = await Promise.all([
          getCandidateById(Number(id), workspaceId),
          getCandidateTranscriptAnalysis(Number(id), workspaceId),
        ]);

        setCandidateName(candidateData.candidate.name);
        setAnalysis(analysisData.analysis);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load interview analysis";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 fade-in max-w-4xl mx-auto">
        <div className="h-8 w-40 rounded bg-secondary animate-pulse" />
        <div className="h-36 rounded-xl bg-card border border-border animate-pulse" />
        <div className="h-56 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 fade-in max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Button>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" /> Interview Analysis
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {candidateName ? `${candidateName}'s Interview Summary` : "Interview Summary"}
        </h2>
        {analysis?.createdAt ? (
          <p className="text-xs text-muted-foreground">Generated {formatDateTime(analysis.createdAt)}</p>
        ) : null}
      </div>

      {!analysis ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No interview transcript found yet. Send the bot to a meeting to generate the interview analysis.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-card border border-border border-l-4 border-l-yellow-400 rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Sparkles className="h-4 w-4 text-yellow-500" /> Summary
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {analysis.summary || "Summary not available yet."}
            </p>
          </section>

          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Questions & Answers</h3>
            {(analysis.questionAnswerPairs?.length || analysis.questionsAsked.length) === 0 ? (
              <p className="text-sm text-muted-foreground">No questions were detected in the transcript.</p>
            ) : (
              <div className="space-y-3">
                {(analysis.questionAnswerPairs && analysis.questionAnswerPairs.length > 0
                  ? analysis.questionAnswerPairs
                  : analysis.questionsAsked.map((question) => ({ question, answer: "" }))
                ).map((pair, index) => (
                  <div key={`${analysis.id}-${index}`} className="rounded-lg border border-border/60 bg-secondary/20 p-4">
                    <div className="text-xs text-muted-foreground mb-2">Question {index + 1}</div>
                    <p className="text-sm text-foreground leading-relaxed mb-2">{pair.question}</p>
                    <div className="text-xs text-muted-foreground mb-1">Answer</div>
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {pair.answer || "Answer not available."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
