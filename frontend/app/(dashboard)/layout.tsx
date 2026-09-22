"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { createWorkspace } from "@/api/workspace";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { meData, selectedWorkspaceId, setSelectedWorkspaceId, refreshMe, isLoading } = useWorkspace();

  const activeMembership =
    meData?.workspaces.find((membership) => membership.workspace.id === selectedWorkspaceId) ||
    meData?.workspaces[0];
  const activeWorkspace = activeMembership?.workspace;

  const handleCreateOrganization = async (name: string) => {
    const workspace = await createWorkspace(name);
    await refreshMe();
    setSelectedWorkspaceId(workspace.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <DashboardSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={meData?.name}
        userRole={activeMembership?.role}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          userName={meData?.name}
          workspaceName={activeWorkspace?.name}
          workspaces={meData?.workspaces.map((membership) => membership.workspace) || []}
          selectedWorkspaceId={activeWorkspace?.id}
          onWorkspaceChange={setSelectedWorkspaceId}
          onCreateOrganization={handleCreateOrganization}
        />
        <main key={selectedWorkspaceId} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
