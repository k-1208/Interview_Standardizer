"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KpiCards from "@/components/dashboard/KpiCards";
import RecentCandidatesTable from "@/components/dashboard/RecentCandidates";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/api/user";

export default function DashboardHome() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        console.log("[dashboard] profile data", data);
        setProfileData(data);
      } catch (error) {
        console.error("[dashboard] failed to load profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const memoizedProfileData = useMemo(() => profileData, [profileData]);

  return (
    <div className="space-y-8 fade-in">
      <KpiCards kpisData={memoizedProfileData} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Candidates</h2>
          <Button variant="outline" size="sm" onClick={() => router.push("/candidates")} className="text-xs">
            View All
          </Button>
        </div>
        <RecentCandidatesTable candidates={memoizedProfileData?.dashboard?.recentCandidates} />
      </section>
    </div>
  );
}
