"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptInvite, emailsMatch, validateInvite } from "@/api/invite";
import { clearStoredToken, getStoredToken, logout, me, register } from "@/api/auth";

interface InviteDetails {
  email: string;
  role: string;
  expiresAt: string;
  accountExists?: boolean;
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
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const accountMatchesInvite = emailsMatch(currentEmail, invite?.email);
  const needsNewAccount = Boolean(invite && !invite.accountExists);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadInvite = async () => {
      try {
        const data = await validateInvite(token);
        if (!isMounted) return;
        setInvite(data);

        if (getStoredToken()) {
          try {
            const user = await me();
            if (!isMounted) return;

            if (emailsMatch(user.email, data.email)) {
              await acceptInvite(token);
              router.push("/dashboard");
              return;
            }

            try {
              await logout();
            } catch {
              clearStoredToken();
            }
            if (isMounted) setCurrentEmail(null);
          } catch {
            clearStoredToken();
            if (isMounted) setCurrentEmail(null);
          }
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
  }, [token, router]);

  const headerText = useMemo(() => {
    if (!invite) return "Workspace Invitation";
    return `Join ${invite.workspace.name}`;
  }, [invite]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setErrorMessage("");

    try {
      await acceptInvite(token);
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/does not match user/i.test(message)) {
        try {
          await logout();
        } catch {
          clearStoredToken();
        }
        setCurrentEmail(null);
        setErrorMessage("");
        return;
      }
      setErrorMessage(message || "Couldn't accept this invitation. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !invite) return;

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsAccepting(true);
    setErrorMessage("");

    try {
      await register({
        email: invite.email,
        password,
        inviteToken: token,
        name: invite.email.split("@")[0] || invite.workspace.name,
      });
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/already in use/i.test(message)) {
        router.push(`/?inviteToken=${token}`);
        return;
      }
      setErrorMessage(message || "Couldn't create your account. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    if (!token) return;
    router.push(`/?inviteToken=${token}`);
  };

  return (
    <main className="auth-shell min-h-screen flex items-center justify-center px-4">
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
                <span className="text-xs text-muted-foreground">Organization</span>
                <span className="text-sm font-medium text-foreground">{invite.workspace.name}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Invited by</span>
                <span className="text-sm text-foreground">{invite.invitedBy?.name || "Team"}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm text-foreground">{invite.email}</span>
              </div>
            </div>

            {accountMatchesInvite ? (
              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                {isAccepting ? "Accepting..." : "Accept Invitation"}
              </button>
            ) : needsNewAccount ? (
              <form className="space-y-4" onSubmit={handleCreateAccount}>
                <p className="text-sm text-muted-foreground">
                  No account exists for this email yet. Set a password to join {invite.workspace.name}.
                </p>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="Create a password"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    placeholder="Confirm password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  disabled={isAccepting}
                >
                  {isAccepting ? "Joining..." : `Join ${invite.workspace.name}`}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={handleLogin}
                >
                  Already have an account? Sign in
                </button>
              </form>
            ) : (
              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={handleLogin}
              >
                Sign in to accept
              </button>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
