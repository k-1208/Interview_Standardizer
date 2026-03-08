"use client";

import { useRouter } from "next/navigation";
import KpiCards from "@/components/dashboard/KpiCards";
import RecentCandidatesTable from "@/components/dashboard/RecentCandidates";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function DashboardHome() {
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <KpiCards />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Candidates</h2>
          <Button variant="outline" size="sm" onClick={() => router.push("/candidates")} className="text-xs">
            View All
          </Button>
        </div>
        <RecentCandidatesTable />
      </section>

      <div className="flex justify-center pt-2">
        <Button onClick={() => router.push("/upload")} className="gap-2">
          <Upload className="w-4 h-4" />
          Upload New Candidate PDF
        </Button>
      </div>
    </div>
  );
}
