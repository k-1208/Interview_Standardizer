"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { clearStoredToken, getStoredToken, me, type MeResponse } from "@/api/auth";

const SELECTED_WORKSPACE_KEY = "selected_workspace_id";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }
    let isMounted = true;

    const loadMe = async () => {
      try {
        const data = await me();
        console.log("[auth/me] response", data);
        if (isMounted) {
          setMeData(data);
          const storedWorkspaceId = window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
          const parsedStoredId = storedWorkspaceId ? Number(storedWorkspaceId) : undefined;
          const initialWorkspaceId =
            parsedStoredId && data.workspaces.some((membership) => membership.workspace.id === parsedStoredId)
              ? parsedStoredId
              : data.workspaces[0]?.workspace.id;

          setSelectedWorkspaceId(initialWorkspaceId);
          if (initialWorkspaceId) {
            window.localStorage.setItem(SELECTED_WORKSPACE_KEY, String(initialWorkspaceId));
          }
        }
      } catch {
        // If token is invalid, clear it and redirect back to login.
        if (isMounted) {
          clearStoredToken();
          router.replace("/");
        }
      }
    };

    loadMe();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!meData || !selectedWorkspaceId) return;
    window.localStorage.setItem(SELECTED_WORKSPACE_KEY, String(selectedWorkspaceId));
  }, [meData, selectedWorkspaceId]);

  const activeWorkspace =
    meData?.workspaces.find((membership) => membership.workspace.id === selectedWorkspaceId)?.workspace ||
    meData?.workspaces?.[0]?.workspace;

  const handleWorkspaceChange = (workspaceId: number) => {
    setSelectedWorkspaceId(workspaceId);
    window.localStorage.setItem(SELECTED_WORKSPACE_KEY, String(workspaceId));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          userName={meData?.name}
          workspaceName={activeWorkspace?.name}
          workspaces={meData?.workspaces.map((membership) => membership.workspace) || []}
          selectedWorkspaceId={activeWorkspace?.id}
          onWorkspaceChange={handleWorkspaceChange}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
