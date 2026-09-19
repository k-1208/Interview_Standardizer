"use client";

import { useState } from "react";
import { Menu, Bell, Search, LogOut, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/dashboard/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/api/auth";
import type { WorkspaceSummary } from "@/api/auth";

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  title?: string;
  actions?: React.ReactNode;
  userName?: string;
  workspaceName?: string;
  workspaces?: WorkspaceSummary[];
  selectedWorkspaceId?: number;
  onWorkspaceChange?: (workspaceId: number) => void;
  onCreateOrganization?: (name: string) => Promise<void>;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Admissions Dashboard",
  "/candidates": "Candidate Database",
  "/upload": "Upload Student Application",
  "/review": "Review Extracted Information",
  "/export": "Export Interview Pack",
  "/interviews": "Interviews",
  "/settings": "Settings",
};

const DashboardHeader = ({
  onToggleSidebar,
  title,
  actions,
  userName,
  workspaceName,
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  onCreateOrganization,
}: DashboardHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [createOrgError, setCreateOrgError] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Local token is still cleared in logout() finally block.
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  const pageTitle = title || pageTitles[pathname] || "Dashboard";
  const displayName = userName || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
  const selectedWorkspaceValue = selectedWorkspaceId ? String(selectedWorkspaceId) : undefined;

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateOrganization || !newOrgName.trim()) {
      setCreateOrgError("Organization name is required");
      return;
    }

    setCreateOrgError("");
    setIsCreatingOrg(true);
    try {
      await onCreateOrganization(newOrgName.trim());
      setNewOrgName("");
      setShowCreateOrg(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create organization";
      setCreateOrgError(message);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {pathname === "/dashboard" ||
        pathname === "/candidates" ||
        pathname === "/settings" ||
        pathname.startsWith("/candidate/") ? null : (
          <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
        )}

        <div className="hidden md:flex items-center gap-2 min-w-48">
          {workspaces && workspaces.length > 0 ? (
            <Select
              value={selectedWorkspaceValue}
              onValueChange={(value) => onWorkspaceChange?.(Number(value))}
            >
              <SelectTrigger className="h-9 w-full max-w-64 bg-background/80">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={String(workspace.id)}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {onCreateOrganization ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1"
              onClick={() => {
                setCreateOrgError("");
                setShowCreateOrg(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              New org
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-background rounded-full px-3 py-1.5 w-56 border border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>

        <Button
          onClick={() => router.push("/upload")}
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium hidden sm:flex"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload PDF
        </Button>

        {actions}

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            {workspaceName ? (
              <span className="text-xs text-muted-foreground">{workspaceName}</span>
            ) : null}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
      {showCreateOrg ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
            role="dialog"
            aria-labelledby="create-org-title"
          >
            <h2 id="create-org-title" className="text-lg font-semibold text-foreground">
              Create organization
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You will be the owner of this workspace. Data stays separate from your other organizations.
            </p>
            <form onSubmit={handleCreateOrgSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Plaksha UG 2026"
                  autoFocus
                  required
                />
              </div>
              {createOrgError ? <p className="text-sm text-red-600">{createOrgError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateOrg(false)}
                  disabled={isCreatingOrg}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingOrg}>
                  {isCreatingOrg ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default DashboardHeader;