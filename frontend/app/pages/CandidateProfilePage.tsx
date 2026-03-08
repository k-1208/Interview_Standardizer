import { useParams, useNavigate } from "react-router-dom";
import { mockCandidates, statusConfig } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Sparkles,
  MessageSquare,
  History,
  FileDown,
  BookOpen,
  Trophy,
  ArrowLeft,
} from "lucide-react";

const CandidateProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const candidate = mockCandidates.find((c) => c.id === id) || mockCandidates[0];
  const status = statusConfig[candidate.status];

  return (
    <div className="space-y-6 fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/candidates")} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Database
      </Button>

      {/* Profile Summary Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start gap-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
          {candidate.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-foreground">{candidate.name}</h2>
            <span className={`status-badge ${status.className}`}>{status.label}</span>
          </div>
          <p className="text-sm text-muted-foreground">{candidate.degree} · {candidate.board} · GPA {candidate.gpa}</p>
          <p className="text-xs text-muted-foreground mt-1">{candidate.email}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={() => navigate(`/candidate/${id}/questions`)} className="gap-1.5">
            <MessageSquare className="w-4 h-4" /> Generate Questions
          </Button>
          <Button variant="outline" onClick={() => navigate(`/candidate/${id}/history`)} className="gap-1.5">
            <History className="w-4 h-4" /> History
          </Button>
          <Button variant="outline" onClick={() => navigate("/export")} className="gap-1.5">
            <FileDown className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Academic Performance */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4 text-primary" /> Academic Performance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-xs text-muted-foreground">Grade 10</p>
                <p className="text-lg font-semibold text-foreground">{candidate.grade10}%</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-xs text-muted-foreground">Grade 12</p>
                <p className="text-lg font-semibold text-foreground">{candidate.grade12}%</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-xs text-muted-foreground">Board</p>
                <p className="text-sm font-medium text-foreground">{candidate.board}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-xs text-muted-foreground">GPA</p>
                <p className="text-sm font-medium text-foreground">{candidate.gpa}</p>
              </div>
            </div>
          </section>

          {/* Activities & Leadership */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-accent" /> Activities & Leadership
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
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Essays & Key Themes */}
          <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-primary" /> Essays & Key Themes
            </h3>
            <div className="space-y-4">
              {candidate.essays.map((essay, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{essay.title}</p>
                  <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{essay.content}</p>
                </div>
              ))}
            </div>
          </section>

          {/* AI Summary */}
          <section className="bg-card border border-border rounded-xl p-6 border-l-4 border-l-accent" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" /> AI Summary
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">{candidate.summary}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-success mb-2">Strengths</h4>
                <ul className="space-y-1.5">
                  {candidate.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-success mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-warning mb-2">Growth Areas</h4>
                <ul className="space-y-1.5">
                  {candidate.growthAreas.map((g, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-warning mt-1.5 flex-shrink-0" />
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
                  className="text-xs font-medium px-2.5 py-1 bg-primary/8 text-primary border-primary/15 hover:bg-primary/15 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfilePage;