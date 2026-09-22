"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { getProfile } from "@/api/user";
import { inviteMember } from "@/api/invite";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  getWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type WorkspaceMemberProfile,
  type WorkspaceMemberRole,
} from "@/api/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { DataPanel, DataTable, DataTd, DataTh } from "@/components/ui/data-panel";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatRole, getInitials } from "@/lib/display";

type MemberRole = "all" | "admin" | "reviewer";

type WorkspaceMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  joinedAt?: string;
};

const ROLE_FILTERS: { id: MemberRole; label: string }[] = [
  { id: "all", label: "All" },
  { id: "admin", label: "Admin" },
  { id: "reviewer", label: "Reviewer" },
];

const formatJoinedAt = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getRoleBadge = (role: string) => {
  const formatted = formatRole(role);
  const className =
    role === "super_admin"
      ? "text-amber-700 dark:text-amber-400"
      : role === "admin"
        ? "text-violet-700 dark:text-violet-400"
        : "text-emerald-700 dark:text-emerald-400";

  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px]", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="text-foreground/80">{formatted}</span>
    </span>
  );
};

export default function SettingsPage() {
  const { selectedWorkspaceId } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const [profileData, setProfileData] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("reviewer");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole>("all");
  const [memberActionError, setMemberActionError] = useState("");
  const [memberActionSuccess, setMemberActionSuccess] = useState("");
  const [profileMember, setProfileMember] = useState<WorkspaceMemberProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [roleTarget, setRoleTarget] = useState<WorkspaceMember | null>(null);
  const [nextRole, setNextRole] = useState<WorkspaceMemberRole>("reviewer");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadProfile = async (workspaceId: number) => {
    const data = await getProfile(workspaceId);
    setProfileData(data);
  };

  useEffect(() => {
    const workspaceId = Number(selectedWorkspaceId);
    if (!Number.isFinite(workspaceId) || workspaceId <= 0) return;

    let isMounted = true;

    const load = async () => {
      try {
        const data = await getProfile(workspaceId);
        if (isMounted) {
          setProfileData(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[settings] failed to load profile:", message);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = useMemo(() => {
    const profileUser = profileData?.user;
    const role = profileData?.membership?.role || profileData?.position?.role;

    return {
      name: profileUser?.name || "—",
      email: profileUser?.email || "—",
      organizationName: profileData?.workspace?.name || profileUser?.organizationName || "—",
      role: role || "—",
      aiQuestionGeneration: true,
    };
  }, [profileData]);

  const members = useMemo<WorkspaceMember[]>(() => {
    const orgUsers = profileData?.organizationUsers;
    if (!Array.isArray(orgUsers)) return [];

    return orgUsers
      .filter((member: any) => member.role !== "super_admin")
      .map((member: any) => ({
        id: Number(member.user?.id || member.userId),
        name: member.user?.name || "—",
        email: member.user?.email || "—",
        role: member.role || "reviewer",
        joinedAt: member.joinedAt,
      }))
      .filter((member: WorkspaceMember) => Number.isFinite(member.id) && member.id > 0);
  }, [profileData]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return members.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [members, memberSearch, roleFilter]);

  const activeWorkspaceId = selectedWorkspaceId ?? profileData?.workspace?.id;

  const canInvite = useMemo(() => {
    return ["super_admin", "admin"].includes(user.role);
  }, [user.role]);

  const currentUserId = Number(profileData?.user?.id);

  const canManageMember = (member: WorkspaceMember) => {
    if (!canInvite) return false;
    if (Number(member.id) === currentUserId) return false;
    if (user.role === "admin" && member.role !== "reviewer") return false;
    return true;
  };

  const closeMenu = () => setOpenMenuId(null);

  const handleViewProfile = async (member: WorkspaceMember) => {
    if (!activeWorkspaceId) return;
    closeMenu();
    setMemberActionError("");
    setMemberActionSuccess("");
    setIsLoadingProfile(true);
    setProfileMember({
      id: member.id,
      name: member.name,
      email: member.email,
      organizationName: user.organizationName,
      role: member.role,
      joinedAt: member.joinedAt || "",
    });

    try {
      const data = await getWorkspaceMember(Number(activeWorkspaceId), member.id);
      setProfileMember(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load member profile";
      setMemberActionError(message);
      setProfileMember(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleOpenChangeRole = (member: WorkspaceMember) => {
    closeMenu();
    setMemberActionError("");
    setRoleTarget(member);
    setNextRole(member.role === "admin" ? "admin" : "reviewer");
  };

  const handleSaveRole = async () => {
    if (!activeWorkspaceId || !roleTarget) return;
    setIsSavingRole(true);
    setMemberActionError("");
    setMemberActionSuccess("");

    try {
      await updateWorkspaceMemberRole(Number(activeWorkspaceId), roleTarget.id, nextRole);
      await loadProfile(Number(activeWorkspaceId));
      setMemberActionSuccess(`${roleTarget.name}'s role updated to ${nextRole === "admin" ? "Admin" : "Reviewer"}.`);
      setRoleTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update role";
      setMemberActionError(message);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleOpenRemove = (member: WorkspaceMember) => {
    closeMenu();
    setMemberActionError("");
    setRemoveTarget(member);
  };

  const handleConfirmRemove = async () => {
    if (!activeWorkspaceId || !removeTarget) return;
    setIsRemoving(true);
    setMemberActionError("");
    setMemberActionSuccess("");

    try {
      await removeWorkspaceMember(Number(activeWorkspaceId), removeTarget.id);
      await loadProfile(Number(activeWorkspaceId));
      setMemberActionSuccess(`${removeTarget.name} was removed from the workspace.`);
      setRemoveTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove member";
      setMemberActionError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail || !activeWorkspaceId) {
      setInviteError("Email and workspace are required");
      return;
    }

    setInviteError("");
    setIsInviting(true);

    try {
      await inviteMember({
        email: inviteEmail,
        role: inviteRole as "admin" | "reviewer",
        workspaceId: activeWorkspaceId,
      });

      setInviteEmail("");
      setInviteRole("reviewer");
      setShowInviteModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isInternal = /queue|smtp|redis|service bus|workspaceid|enqueu/i.test(message);
      setInviteError(
        !message || isInternal ? "Couldn't send the invitation. Please try again." : message
      );
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in space-y-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Admin</p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground mt-1">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Account details, appearance, and workspace members.</p>
      </div>

      <DataPanel className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Account Settings</h2>
            <p className="text-xs text-muted-foreground mt-1">Personal details, organization, and permissions</p>
          </div>
          <div>{getRoleBadge(user.role)}</div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border/70">
            <div>
              <p className="text-sm font-medium text-foreground">Name</p>
              <p className="text-xs text-muted-foreground">{user.name}</p>
            </div>
            <button className="text-xs text-primary font-medium hover:underline">Edit</button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/70">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button className="text-xs text-primary font-medium hover:underline">Edit</button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/70">
            <div>
              <p className="text-sm font-medium text-foreground">Organization</p>
              <p className="text-xs text-muted-foreground">{user.organizationName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border/70">
            <div>
              <p className="text-sm font-medium text-foreground">Workspace Role</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
            </div>
            <div>{getRoleBadge(user.role)}</div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">AI Question Generation</p>
              <p className="text-xs text-muted-foreground">
                {user.aiQuestionGeneration ? "Auto-generate questions on profile parse" : "Disabled"}
              </p>
            </div>
            <div className={`w-10 h-5 rounded-full relative ${user.aiQuestionGeneration ? "bg-primary" : "bg-muted"} cursor-pointer`}>
              <div
                className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-0.5 transition-all ${
                  user.aiQuestionGeneration ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border/70">
            <div>
              <p className="text-sm font-medium text-foreground">Appearance</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </DataPanel>

      <DataPanel className="overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Workspace members</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage member access, permissions and workspace roles.
            </p>
          </div>
          {canInvite ? (
            <Button
              className="h-10 px-4 rounded-full font-medium shrink-0 self-start bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                setInviteError("");
                setShowInviteModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> Invite member
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-md">Role: Read-only</span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between px-4 sm:px-5 pb-3">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-10 pl-10 rounded-full bg-background border-border shadow-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((filter) => {
              const isActive = roleFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setRoleFilter(filter.id)}
                  className={cn(
                    "h-10 px-3.5 rounded-full text-xs font-medium border transition-colors",
                    isActive
                      ? "bg-muted text-foreground border-border"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">{filteredMembers.length}</span>
            {` member${filteredMembers.length === 1 ? "" : "s"} in this view`}
          </p>
        </div>

        {memberActionSuccess ? (
          <div className="mx-4 mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {memberActionSuccess}
          </div>
        ) : null}
        {memberActionError ? (
          <div className="mx-4 mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
            {memberActionError}
          </div>
        ) : null}

        <DataTable className="overflow-visible">
          <thead>
            <tr>
              <DataTh className="w-[46%]">Member</DataTh>
              <DataTh className="w-[20%]">Role</DataTh>
              <DataTh className="w-[24%]">Joined</DataTh>
              <DataTh className="w-[10%]" align="right">
                Action
              </DataTh>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                  Workspace members are not available or restricted for your role.
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                  No members match the current filters.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  tabIndex={0}
                  onClick={() => handleViewProfile(member)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleViewProfile(member);
                    }
                  }}
                  className="cursor-pointer hover:bg-muted/60 transition-colors outline-none focus-visible:bg-muted/60"
                >
                  <DataTd>
                    <div className="flex items-center gap-3 min-w-0">
                      <InitialsAvatar name={member.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{member.email}</p>
                      </div>
                    </div>
                  </DataTd>
                  <DataTd>{getRoleBadge(member.role)}</DataTd>
                  <DataTd>
                    <span className="text-sm text-muted-foreground">{formatJoinedAt(member.joinedAt)}</span>
                  </DataTd>
                  <DataTd
                    align="right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {canManageMember(member) ? (
                      <div
                        className="relative inline-flex justify-end"
                        ref={openMenuId === member.id ? menuRef : undefined}
                      >
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
                          onClick={() => setOpenMenuId((current) => (current === member.id ? null : member.id))}
                          aria-label={`Actions for ${member.name}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === member.id ? (
                          <div className="absolute right-0 top-9 w-40 rounded-lg border border-border bg-popover shadow-md z-20 py-1">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted"
                              onClick={() => handleOpenChangeRole(member)}
                            >
                              Change role
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-muted"
                              onClick={() => handleOpenRemove(member)}
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </DataTd>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </DataPanel>

      {profileMember || isLoadingProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Member Profile</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setProfileMember(null);
                  setIsLoadingProfile(false);
                }}
              >
                ✕
              </button>
            </div>
            {isLoadingProfile ? (
              <p className="text-sm text-muted-foreground">Loading member details...</p>
            ) : profileMember ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {getInitials(profileMember.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profileMember.name}</p>
                    <p className="text-xs text-muted-foreground">{profileMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-muted-foreground">Role</p>
                    <div className="mt-1.5">{getRoleBadge(profileMember.role)}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-muted-foreground">Assigned candidates</p>
                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {profileMember.assignedCandidateCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 col-span-2">
                    <p className="text-muted-foreground">Joined</p>
                    <p className="mt-1.5 text-foreground">{formatJoinedAt(profileMember.joinedAt)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {roleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Change Role</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setRoleTarget(null)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Update <span className="text-foreground font-medium">{roleTarget.name}</span>'s workspace role.
            </p>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={nextRole}
              onChange={(e) => setNextRole(e.target.value as WorkspaceMemberRole)}
            >
              <option value="reviewer">Reviewer (Evaluates assigned candidates)</option>
              <option value="admin">Admin (Manages candidates & invites team)</option>
            </select>
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                className="text-xs px-3.5 py-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setRoleTarget(null)}
              >
                Cancel
              </button>
              <button
                className="text-xs bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                onClick={handleSaveRole}
                disabled={isSavingRole}
              >
                {isSavingRole ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Remove Member</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setRemoveTarget(null)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Remove <span className="text-foreground font-medium">{removeTarget.name}</span> from this workspace?
              Assigned candidates will be unassigned.
            </p>
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                className="text-xs px-3.5 py-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setRemoveTarget(null)}
              >
                Cancel
              </button>
              <button
                className="text-xs bg-destructive text-destructive-foreground font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showInviteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Invite Workspace Member</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="reviewer@organization.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Workspace Role</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="reviewer">Reviewer (Evaluates assigned candidates)</option>
                  <option value="admin">Admin (Manages candidates & invites team)</option>
                </select>
              </div>
            </div>

            {inviteError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {inviteError}
              </div>
            ) : null}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                className="text-xs px-3.5 py-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>
              <button
                className="text-xs bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                onClick={handleInviteSubmit}
                disabled={isInviting}
              >
                {isInviting ? "Sending Email..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
