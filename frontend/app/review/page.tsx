"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { mockParsedFields, mockCandidateProfile, ParsedField } from "@/lib/mock-data";
import { CheckCircle2, AlertTriangle, AlertCircle, Edit3, Save, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const confidenceIcon = {
  high: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  medium: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
  low: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
};

const confidenceLabel = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

export default function ParsedDataReview() {
  const router = useRouter();
  const { toast } = useToast();
  const [fields, setFields] = useState<ParsedField[]>(mockParsedFields);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const profile = mockCandidateProfile;

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(fields[index].value);
  };

  const saveEdit = (index: number) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], value: editValue };
    setFields(updated);
    setEditingIndex(null);
  };

  const handleSave = () => {
    toast({ title: "Saved to Database", description: "Candidate profile has been saved successfully." });
    router.push("/candidates");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      {/* Personal Information */}
      <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h2 className="text-base font-semibold text-foreground mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field, i) => (
            <div key={field.field} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">{field.field}</label>
                <div className="flex items-center gap-1.5">
                  {confidenceIcon[field.confidence]}
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {confidenceLabel[field.confidence]}
                  </span>
                </div>
              </div>
              {editingIndex === i ? (
                <div className="flex gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-9 text-sm bg-background"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={() => saveEdit(i)}>
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/40 border border-border/50 group cursor-pointer hover:border-primary/20 transition-colors"
                  onClick={() => startEdit(i)}
                >
                  <span className="text-sm text-foreground">{field.value}</span>
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Academic Records */}
      <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Academic Records</h2>
          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
            <CheckCircle2 className="w-3 h-3" /> High Confidence
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Board</p>
            <p className="text-sm font-medium text-foreground">{profile.board}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Grade 10</p>
            <p className="text-sm font-medium text-foreground">{profile.grade10}%</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Grade 12</p>
            <p className="text-sm font-medium text-foreground">{profile.grade12}%</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">GPA</p>
            <p className="text-sm font-medium text-foreground">{profile.gpa}</p>
          </div>
        </div>
      </section>

      {/* Essays */}
      <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Essays</h2>
          <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
            <CheckCircle2 className="w-3 h-3" /> High Confidence
          </Badge>
        </div>
        <div className="space-y-4">
          {profile.essays.map((essay, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{essay.title}</p>
              <Textarea
                value={essay.content}
                readOnly
                className="text-sm bg-secondary/30 border-border/50 min-h-[100px] resize-none"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Activities & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Co-Curricular Activities</h2>
            <Badge variant="outline" className="text-xs gap-1 text-yellow-600 border-yellow-200">
              <AlertTriangle className="w-3 h-3" /> Medium
            </Badge>
          </div>
          <ul className="space-y-2">
            {profile.activities.map((a, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Leadership & Achievements</h2>
            <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
              <CheckCircle2 className="w-3 h-3" /> High
            </Badge>
          </div>
          <ul className="space-y-2">
            {profile.achievements.map((a, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push("/upload")}>
          <FileText className="w-4 h-4 mr-1.5" />
          Edit PDF
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Cancel</Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-1.5" />
          Save to Database
        </Button>
      </div>
    </div>
  );
}
