"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { generateInterviewQuestions } from "@/api/ai";
import { InterviewQuestion } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  GraduationCap,
  Target,
  Users,
  Shield,
  Lightbulb,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

const categoryConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  academic: { label: "Academic Depth", color: "bg-primary/10 text-primary border-primary/20", icon: GraduationCap },
  motivation: { label: "Motivation & Purpose", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Target },
  leadership: { label: "Leadership", color: "bg-green-50 text-green-700 border-green-200", icon: Users },
  ethics: { label: "Ethics", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Shield },
  problem_solving: { label: "Problem Solving", color: "bg-orange-50 text-orange-700 border-orange-200", icon: Lightbulb },
};

const difficultyConfig: Record<string, { label: string; stars: number }> = {
  easy: { label: "Easy", stars: 1 },
  medium: { label: "Medium", stars: 2 },
  hard: { label: "Hard", stars: 3 },
};

const difficultySentiment: Record<string, { up: string; down: string }> = {
  easy: { up: "text-emerald-500", down: "text-border" },
  medium: { up: "text-amber-500", down: "text-amber-500" },
  hard: { up: "text-border", down: "text-rose-500" },
};

export default function AIQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [explainId, setExplainId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [feedbackById, setFeedbackById] = useState<Record<string, "up" | "down" | null>>({});

  const categories = ["all", ...Object.keys(categoryConfig)];
  const filtered = useMemo(() => {
    if (activeFilter === "all") return questions;
    return questions.filter((q) => q.category === activeFilter);
  }, [activeFilter, questions]);

  const explainQuestion = questions.find((q) => q.id === explainId);

  const generateQuestions = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError("");
      setExplainId(null);

      const response = await generateInterviewQuestions({
        candidateId: Number(id),
        count: 6,
        difficulty: "medium",
      });

      const mapped = response.questions.map((item, index) => {
        const categoryMap: Record<string, InterviewQuestion["category"]> = {
          "Depth of Thinking": "academic",
          "Learning Ability": "academic",
          "Curiosity": "motivation",
          "Decision-Making": "problem_solving",
          "Intellectual Honesty": "ethics",
        };

        return {
          id: `Q${index + 1}`,
          category: categoryMap[item.dimension] || "academic",
          difficulty: item.difficulty,
          question: item.question,
          skillEvaluated: item.dimension,
          rationale: item.why_this_question,
          sourceText: item.anchor,
          confidence: undefined,
          tags: [item.cognitive_type],
        } satisfies InterviewQuestion;
      });

      setQuestions(mapped);
      setActiveFilter("all");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate questions";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [id]);

  useEffect(() => {
    if (searchParams.get("generate") === "1") {
      generateQuestions();
    }
  }, [generateQuestions, searchParams]);

  if (isGenerating && questions.length === 0) {
    return (
      <div className="space-y-6 fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Button>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Generating interview questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const config = cat !== "all" ? categoryConfig[cat] : null;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                disabled={questions.length === 0}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                  activeFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
                  questions.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                {cat === "all" ? "All Questions" : config?.label}
              </button>
            );
          })}
        </div>
        <Button onClick={generateQuestions} disabled={isGenerating} className="gap-2">
          {isGenerating ? "Generating..." : "Generate Questions"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {questions.length === 0 && !isGenerating ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Click "Generate Questions" to load dummy interview questions.
        </div>
      ) : null}

      {/* Split view if explaining */}
      <div className={cn("grid gap-6", explainId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {/* Questions list */}
        <div className="space-y-3">
          {filtered.map((q) => {
            const cat = categoryConfig[q.category] || categoryConfig.academic;
            const sentiment = difficultySentiment[q.difficulty] || difficultySentiment.medium;
            const feedback = feedbackById[q.id] || null;
            const CatIcon = cat.icon;

            return (
              <div
                key={q.id}
                className={cn(
                  "bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-md",
                  explainId === q.id ? "border-primary ring-1 ring-primary/20" : "border-border"
                )}
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
                    <CatIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-relaxed mb-2">{q.question}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-medium border", cat.color)}>
                        {cat.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Skill: {q.skillEvaluated}</span>
                      <span className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFeedbackById((current) => ({
                              ...current,
                              [q.id]: current[q.id] === "up" ? null : "up",
                            }));
                          }}
                          className={cn(
                            "flex items-center justify-center rounded-full p-1 transition-colors",
                            feedback === "up" ? "bg-emerald-100" : "hover:bg-muted"
                          )}
                          aria-label="Thumbs up"
                        >
                          <ThumbsUp
                            className={cn(
                              "w-3.5 h-3.5",
                              feedback === "up" ? "text-emerald-600" : sentiment.up
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFeedbackById((current) => ({
                              ...current,
                              [q.id]: current[q.id] === "down" ? null : "down",
                            }));
                          }}
                          className={cn(
                            "flex items-center justify-center rounded-full p-1 transition-colors",
                            feedback === "down" ? "bg-rose-100" : "hover:bg-muted"
                          )}
                          aria-label="Thumbs down"
                        >
                          <ThumbsDown
                            className={cn(
                              "w-3.5 h-3.5",
                              feedback === "down" ? "text-rose-600" : sentiment.down
                            )}
                          />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pl-11">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-primary hover:text-primary"
                    onClick={() => setExplainId(explainId === q.id ? null : q.id)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {explainId === q.id ? "Hide Explanation" : "View Why This Was Generated"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explainability panel */}
        {explainId && explainQuestion && (
          <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Question Explainability</h3>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Question</p>
                <p className="text-sm text-foreground leading-relaxed">{explainQuestion.question}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Skill Evaluated</p>
                <Badge variant="secondary" className="text-xs">{explainQuestion.skillEvaluated}</Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reason for Generation</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{explainQuestion.rationale}</p>
              </div>

              {explainQuestion.sourceText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Source Text from PDF</p>
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground leading-relaxed italic">"{explainQuestion.sourceText}"</p>
                    </div>
                  </div>
                </div>
              )}

              {explainQuestion.confidence !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Confidence Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${explainQuestion.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{explainQuestion.confidence}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
