"use client";

import { useRouter } from "next/navigation";
import KpiCards from "@/components/dashboard/KpiCards";
import RecentCandidatesTable from "@/components/dashboard/RecentCandidates";
import { Button } from "@/components/ui/button";

export default function DashboardHome() {
  const router = useRouter();

  return (
    <div className="space-y-8 fade-in">
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
    </div>
  );
}
