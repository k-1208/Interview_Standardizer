"use client";

import { useParams, useRouter } from "next/navigation";
import { mockInterviewHistory } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, FileText, GitCompare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function InterviewHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (histId: string) => {
    setSelected((prev) =>
      prev.includes(histId)
        ? prev.filter((s) => s !== histId)
        : prev.length < 2
        ? [...prev, histId]
        : [prev[1], histId]
    );
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/candidate/${id}`)} className="gap-1.5 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Interview History</h2>
          <p className="text-sm text-muted-foreground">View and compare generated question sets</p>
        </div>
        <Button
          variant="outline"
          disabled={selected.length !== 2}
          className="gap-1.5"
        >
          <GitCompare className="w-4 h-4" />
          Compare Selected ({selected.length}/2)
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {mockInterviewHistory.map((h, i) => (
          <div
            key={h.id}
            onClick={() => toggleSelect(h.id)}
            className={cn(
              "bg-card border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md relative",
              selected.includes(h.id)
                ? "border-primary ring-1 ring-primary/20"
                : "border-border"
            )}
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {/* Selection indicator */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors",
              selected.includes(h.id) ? "bg-primary" : "bg-transparent"
            )} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{h.version}</span>
                    {i === 0 && <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-0">Latest</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {h.dateGenerated}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {h.generatedBy}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{h.questionCount} questions</p>
                <p className="text-xs text-muted-foreground">Click to select</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
