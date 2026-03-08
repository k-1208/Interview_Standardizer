"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Link2, FileText, BookOpen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const exportOptions = [
  { id: "academic", label: "Include academic summary", icon: BookOpen, defaultChecked: true },
  { id: "essays", label: "Include essays", icon: FileText, defaultChecked: true },
  { id: "rationale", label: "Include AI rationale", icon: Sparkles, defaultChecked: false },
];

export default function ExportPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(exportOptions.map((o) => [o.id, o.defaultChecked]))
  );

  const toggleOption = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = (type: "pdf" | "link") => {
    toast({
      title: type === "pdf" ? "PDF Exported" : "Link Generated",
      description: type === "pdf"
        ? "Interview pack has been downloaded as PDF."
        : "Shareable link has been copied to clipboard.",
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Export Interview Pack</h2>
        <p className="text-sm text-muted-foreground">
          Choose what to include in the exported interview preparation document.
        </p>
      </div>

      {/* Options */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        {exportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.id}
              className="flex items-center gap-4 cursor-pointer group"
            >
              <Checkbox
                checked={selected[option.id]}
                onChange={() => toggleOption(option.id)}
              />
              <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-foreground">{option.label}</span>
            </label>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => handleExport("pdf")} className="flex-1 gap-2">
          <FileDown className="w-4 h-4" />
          Export as PDF
        </Button>
        <Button variant="outline" onClick={() => handleExport("link")} className="flex-1 gap-2">
          <Link2 className="w-4 h-4" />
          Generate Shareable Link
        </Button>
      </div>
    </div>
  );
}
