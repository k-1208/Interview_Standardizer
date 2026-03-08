"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "file_selected" | "parsing" | "complete";

const parsingSteps = [
  "Parsing academic records…",
  "Extracting essays and activities…",
  "Structuring candidate profile…",
];

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const handleFile = (file: File) => {
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      setState("file_selected");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startParsing = async () => {
    setState("parsing");
    setProgress(0);
    setCurrentStep(0);

    for (let i = 0; i <= 100; i += 2) {
      await new Promise((r) => setTimeout(r, 60));
      setProgress(i);
      if (i === 30) setCurrentStep(1);
      if (i === 65) setCurrentStep(2);
    }

    setState("complete");
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/review");
  };

  const handleCancel = () => {
    setState("idle");
    setFileName("");
    setProgress(0);
    setCurrentStep(0);
  };

  if (state === "parsing") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Parsing Application</h2>
        <p className="text-sm text-muted-foreground mb-8">{fileName}</p>

        <div className="space-y-6">
          <div>
            <Progress value={progress} className="h-2 mb-3" />
            <p className="text-xs text-muted-foreground font-mono">{progress}% complete</p>
          </div>

          <div className="space-y-3 text-left max-w-xs mx-auto">
            {parsingSteps.map((step, i) => (
              <div key={i} className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                i < currentStep ? "text-green-600" :
                i === currentStep ? "text-foreground font-medium" :
                "text-muted-foreground/50"
              )}>
                {i < currentStep ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : i === currentStep ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 fade-in">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Parsing Complete</h2>
        <p className="text-sm text-muted-foreground">Redirecting to review…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      {/* Drag & Drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "bg-card border-2 border-dashed rounded-xl p-16 text-center transition-all duration-200 cursor-pointer group",
          dragOver
            ? "border-primary bg-primary/5"
            : state === "file_selected"
            ? "border-green-400/40 bg-green-50/50"
            : "border-border hover:border-primary/40"
        )}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-4">
          {state === "file_selected" ? (
            <>
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to parse · Click to change file</p>
              </div>
            </>
          ) : (
            <>
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                dragOver ? "bg-primary/15" : "bg-secondary group-hover:bg-primary/10"
              )}>
                <Upload className={cn(
                  "w-6 h-6 transition-colors",
                  dragOver ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag & Drop PDF here or <span className="text-primary">Browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF format, up to 10 MB</p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} disabled={state === "idle"}>
          Cancel
        </Button>
        <Button onClick={startParsing} disabled={state !== "file_selected"}>
          Start Parsing
        </Button>
      </div>
    </div>
  );
}
