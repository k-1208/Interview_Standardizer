"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptInvite, validateInvite } from "@/api/invite";
import { getStoredToken } from "@/api/auth";

interface InviteDetails {
  email: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: number;
    name: string;
    slug: string;
  };
  invitedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

export default function InviteTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const isLoggedIn = useMemo(() => !!getStoredToken(), []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadInvite = async () => {
      try {
        const data = await validateInvite(token);
        if (isMounted) {
          setInvite(data);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Invalid invitation";
          setErrorMessage(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInvite();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const headerText = useMemo(() => {
    if (!invite) return "Workspace Invitation";
    return `Join ${invite.workspace.name}`;
  }, [invite]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setErrorMessage("");

    try {
      const data = await acceptInvite(token);
      const workspaceSlug = data?.workspace?.slug || invite?.workspace.slug;
      router.push(workspaceSlug ? `/dashboard` : "/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to accept invitation";
      setErrorMessage(message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    if (!token) return;
    router.push(`/?inviteToken=${token}`);
  };

  const handleSignup = () => {
    if (!token) return;
    router.push(`/register?inviteToken=${token}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h1 className="text-2xl font-semibold text-foreground">{headerText}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {invite
            ? `You were invited to join ${invite.workspace.name} as ${invite.role.replace("_", " ")}.`
            : "We are validating your invitation."}
        </p>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading invitation...</div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        {invite ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Workspace</span>
                <span className="text-sm font-medium text-foreground">{invite.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Invited by</span>
                <span className="text-sm text-foreground">{invite.invitedBy?.name || "Team"}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Invite sent to</span>
                <span className="text-sm text-foreground">{invite.email}</span>
              </div>
            </div>

            {isLoggedIn ? (
              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                {isAccepting ? "Accepting..." : "Accept Invitation"}
              </button>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
                  onClick={handleLogin}
                >
                  Sign In
                </button>
                <button
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  onClick={handleSignup}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
