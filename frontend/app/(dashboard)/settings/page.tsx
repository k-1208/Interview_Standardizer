"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { getProfile } from "@/api/user";
import { inviteMember } from "@/api/invite";

export default function SettingsPage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("reviewer");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await getProfile();
        if (isMounted) {
          setProfileData(data);
        }
      } catch (error) {
        console.error("[settings] failed to load profile", error);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const user = useMemo(() => {
    const profileUser = profileData?.user;
    const role = profileData?.membership?.role || profileData?.position?.role;

    return {
      name: profileUser?.name || "—",
      email: profileUser?.email || "—",
      organizationName: profileUser?.organizationName || "—",
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

  const activeWorkspaceId = useMemo(() => {
    return (
      profileData?.workspace?.id ||
      profileData?.membership?.workspace?.id ||
      profileData?.position?.workspace?.id ||
      undefined
    );
  }, [profileData]);

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

      setInviteSuccess("Invitation sent successfully.");
      setInviteEmail("");
      setInviteRole("reviewer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invite";
      setInviteError(message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto fade-in space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Account Settings</h2>
            <p className="text-xs text-muted-foreground mt-1">Personal details and preferences</p>
          </div>
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

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Role</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">Manage access and roles</p>
          </div>
          <button
            className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-md"
            onClick={() => {
              setInviteError("");
              setInviteSuccess("");
              setShowInviteModal(true);
            }}
          >
            Invite Member
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {members.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-background p-4 text-xs text-muted-foreground">
              Workspace members are not available for your role.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-background">
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
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">Joined {member.joinedAt}</p>
                  </div>

                  <details className="relative">
                    <summary className="list-none cursor-pointer text-xs text-primary font-medium hover:underline">
                      Actions
                    </summary>
                    <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-sm">
                      <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted">View Profile</button>
                      <button className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted">Change Role</button>
                      <button className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-muted">Remove</button>
                    </div>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showInviteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Invite Member</h3>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowInviteModal(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-foreground">Email</p>
                <input
                  type="email"
                  placeholder="user@org.edu"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-foreground">Role</p>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="admin">admin</option>
                  <option value="reviewer">reviewer</option>
                </select>
              </div>
            </div>

            {inviteError ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {inviteError}
              </div>
            ) : null}

            {inviteSuccess ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {inviteSuccess}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>
              <button
                className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-md"
                onClick={handleInviteSubmit}
                disabled={isInviting}
              >
                {isInviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
