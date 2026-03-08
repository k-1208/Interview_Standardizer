import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockInterviewQuestions, InterviewQuestion } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Star,
  ArrowLeft,
  Eye,
  GraduationCap,
  Target,
  Users,
  Shield,
  Lightbulb,
  FileText,
} from "lucide-react";

const categoryConfig: Record<InterviewQuestion["category"], { label: string; color: string; icon: React.ElementType }> = {
  academic: { label: "Academic Depth", color: "bg-primary/10 text-primary border-primary/20", icon: GraduationCap },
  motivation: { label: "Motivation & Purpose", color: "bg-accent/15 text-accent-foreground border-accent/30", icon: Target },
  leadership: { label: "Leadership", color: "bg-success/10 text-success border-success/20", icon: Users },
  ethics: { label: "Ethics", color: "bg-info/10 text-info border-info/20", icon: Shield },
  problem_solving: { label: "Problem Solving", color: "bg-warning/10 text-warning border-warning/20", icon: Lightbulb },
};

const difficultyConfig: Record<InterviewQuestion["difficulty"], { label: string; stars: number }> = {
  easy: { label: "Easy", stars: 1 },
  medium: { label: "Medium", stars: 2 },
  hard: { label: "Hard", stars: 3 },
};

const AIQuestionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [explainId, setExplainId] = useState<string | null>(null);

  const categories = ["all", ...Object.keys(categoryConfig)];
  const filtered = activeFilter === "all"
    ? mockInterviewQuestions
    : mockInterviewQuestions.filter((q) => q.category === activeFilter);

  const explainQuestion = mockInterviewQuestions.find((q) => q.id === explainId);

  return (
    <div className="space-y-6 fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const config = cat !== "all" ? categoryConfig[cat as InterviewQuestion["category"]] : null;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                activeFilter === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cat === "all" ? "All Questions" : config?.label}
            </button>
          );
        })}
      </div>

      {/* Split view if explaining */}
      <div className={cn("grid gap-6", explainId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {/* Questions list */}
        <div className="space-y-3">
          {filtered.map((q, index) => {
            const cat = categoryConfig[q.category];
            const diff = difficultyConfig[q.difficulty];
            const CatIcon = cat.icon;

            return (
              <div
                key={q.id}
                className={cn(
                  "bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-card",
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
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-medium border", cat.color)}>
                        {cat.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Skill: {q.skillEvaluated}</span>
                      <span className="flex items-center gap-0.5 ml-auto">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < diff.stars ? "text-accent fill-accent" : "text-border"
                            )}
                          />
                        ))}
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
          <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-6 slide-in-right" style={{ boxShadow: "var(--shadow-md)" }}>
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
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/80 leading-relaxed italic">"{explainQuestion.sourceText}"</p>
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
};

export default AIQuestionsPage;