"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { getProfile } from "@/api/user";
import { inviteMember } from "@/api/invite";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function SettingsPage() {
  const { selectedWorkspaceId } = useWorkspace();
  const [profileData, setProfileData] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("reviewer");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const workspaceId = Number(selectedWorkspaceId);
    if (!Number.isFinite(workspaceId) || workspaceId <= 0) return;

    let isMounted = true;

    const loadProfile = async () => {
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

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

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

  const members = useMemo(() => {
    const orgUsers = profileData?.organizationUsers;
    if (!Array.isArray(orgUsers)) return [];

    return orgUsers.map((member: any) => ({
      id: member.user?.id || member.userId || member.email,
      name: member.user?.name || '—',
      email: member.user?.email || '—',
      role: member.role || 'reviewer',
      joinedAt: member.joinedAt,
    }));
  }, [profileData]);

  const activeWorkspaceId = selectedWorkspaceId ?? profileData?.workspace?.id;

  const canInvite = useMemo(() => {
    return ['super_admin', 'admin'].includes(user.role);
  }, [user.role]);

  const handleInviteSubmit = async () => {
    if (!inviteEmail || !activeWorkspaceId) {
      setInviteError("Email and workspace are required");
      return;
    }

    setInviteError("");
    setInviteSuccess("");
    setIsInviting(true);

    try {
      await inviteMember({
        email: inviteEmail,
        role: inviteRole as "admin" | "reviewer",
        workspaceId: activeWorkspaceId,
      });

      setInviteSuccess("Invitation sent successfully via email queue.");
      setInviteEmail("");
      setInviteRole("reviewer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invite";
      setInviteError(message);
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const formatted = role.replace('_', ' ').toUpperCase();
    switch (role) {
      case 'super_admin':
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full">{formatted}</span>;
      case 'admin':
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full">{formatted}</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full">{formatted}</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto fade-in space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
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
              <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <div>{getRoleBadge(user.role)}</div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">AI Question Generation</p>
              <p className="text-xs text-muted-foreground">{user.aiQuestionGeneration ? 'Auto-generate questions on profile parse' : 'Disabled'}</p>
            </div>
            <div className={`w-10 h-5 rounded-full relative ${user.aiQuestionGeneration ? 'bg-primary' : 'bg-muted'} cursor-pointer`}>
              <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-0.5 transition-all ${user.aiQuestionGeneration ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Workspace Members</h2>
            <p className="text-xs text-muted-foreground mt-1">Manage tenant member access and roles</p>
          </div>
          {canInvite ? (
            <button
              className="text-xs bg-primary text-primary-foreground font-medium px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity"
              onClick={() => {
                setInviteError("");
                setInviteSuccess("");
                setShowInviteModal(true);
              }}
            >
              + Invite Member
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">Role: Read-only</span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {members.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-background p-4 text-xs text-muted-foreground">
              Workspace members are not available or restricted for your role.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-background">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-white text-xs font-semibold">
                    {member.name
                      .split(' ')
                      .map((part: string) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    <span className="text-xs text-muted-foreground hidden sm:inline">Joined {member.joinedAt}</span>
                  </div>

                  {canInvite ? (
                    <details className="relative">
                      <summary className="list-none cursor-pointer text-xs text-primary font-medium hover:underline">
                        Actions
                      </summary>
                      <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-lg z-10 py-1">
                        <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted">View Profile</button>
                        <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted">Change Role</button>
                        <button className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-muted">Remove</button>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

            {inviteSuccess ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                {inviteSuccess}
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
