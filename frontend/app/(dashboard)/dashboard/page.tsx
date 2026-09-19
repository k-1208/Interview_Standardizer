"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import KpiCards from "@/components/dashboard/KpiCards";
import RecentCandidatesTable from "@/components/dashboard/RecentCandidates";
import { getProfile } from "@/api/user";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function DashboardHome() {
  const router = useRouter();
  const { selectedWorkspaceId } = useWorkspace();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const workspaceId = Number(selectedWorkspaceId);
    if (!Number.isFinite(workspaceId) || workspaceId <= 0) return;

    let isMounted = true;
    setIsLoading(true);

    const loadProfile = async () => {
      try {
        const data = await getProfile(workspaceId);
        if (isMounted) {
          setProfileData(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[dashboard] failed to load profile:", message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

  return (
    <div className="space-y-8 fade-in">
      <KpiCards kpisData={profileData} isLoading={isLoading} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent candidates</h2>
          <button
            type="button"
            onClick={() => router.push("/candidates")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </button>
        </div>
        <RecentCandidatesTable
          candidates={profileData?.dashboard?.recentCandidates}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}
