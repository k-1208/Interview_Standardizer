"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  getWorkspaceApiKeys,
  removeWorkspaceApiKey,
  updateWorkspaceApiKey,
  type ApiKeyProvider,
  type WorkspaceApiKeysResponse,
} from "@/api/apiKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataPanel } from "@/components/ui/data-panel";
import { cn } from "@/lib/utils";

const SOURCE_BADGE: Record<"workspace" | "server" | "none", { label: string; className: string }> = {
  workspace: {
    label: "Workspace key",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  server: {
    label: "Using server default",
    className: "bg-muted text-muted-foreground border-border",
  },
  none: {
    label: "Not configured",
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Admin-only panel: view masked workspace API keys and replace/remove them. */
export function ApiKeysPanel({ workspaceId }: { workspaceId: number }) {
  const [data, setData] = useState<WorkspaceApiKeysResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<ApiKeyProvider | null>(null);
  const [draft, setDraft] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [busy, setBusy] = useState<ApiKeyProvider | null>(null);
  const [rowError, setRowError] = useState<{ provider: ApiKeyProvider; message: string } | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoadError("");
      setData(await getWorkspaceApiKeys(workspaceId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load API keys");
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = (provider: ApiKeyProvider) => {
    setEditing(provider);
    setDraft("");
    setShowDraft(false);
    setRowError(null);
    setNotice("");
  };

  const cancelEditing = () => {
    setEditing(null);
    setDraft("");
    setRowError(null);
  };

  const save = async (provider: ApiKeyProvider, label: string) => {
    if (!draft.trim()) {
      setRowError({ provider, message: "Enter the new API key." });
      return;
    }
    try {
      setBusy(provider);
      setRowError(null);
      await updateWorkspaceApiKey(workspaceId, provider, draft);
      setDraft("");
      setEditing(null);
      setNotice(`${label} key saved.`);
      await load();
    } catch (error) {
      setRowError({ provider, message: error instanceof Error ? error.message : "Failed to save key" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (provider: ApiKeyProvider, label: string) => {
    if (!window.confirm(`Remove this workspace's ${label} key? The server default will be used if one exists.`)) return;
    try {
      setBusy(provider);
      setRowError(null);
      await removeWorkspaceApiKey(workspaceId, provider);
      setNotice(`${label} key removed.`);
      await load();
    } catch (error) {
      setRowError({ provider, message: error instanceof Error ? error.message : "Failed to remove key" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DataPanel className="p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} /> API keys
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Keys this workspace uses for AI and meeting services. Keys are encrypted at rest and only a masked
          version is ever shown — enter a new key to replace one.
        </p>
      </div>

      {loadError ? <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p> : null}
      {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
      {data && !data.encryptionConfigured ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Saving workspace keys is disabled until the server administrator sets SETTINGS_ENCRYPTION_KEY.
        </p>
      ) : null}

      {!data && !loadError ? <div className="h-28 rounded-xl bg-muted animate-pulse" /> : null}

      <div className="divide-y divide-border/70">
        {data?.keys.map((key) => {
          const badge = SOURCE_BADGE[key.source];
          const isEditing = editing === key.provider;
          const isBusy = busy === key.provider;
          return (
            <div key={key.provider} className="py-4 first:pt-0 last:pb-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{key.label}</p>
                    <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{key.description}</p>
                  {key.maskedValue ? (
                    <p className="mt-2 font-mono text-sm text-foreground tracking-wide break-all" aria-label="Masked API key">
                      {key.maskedValue}
                    </p>
                  ) : null}
                  {key.updatedAt ? (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Updated {formatDate(key.updatedAt)}
                      {key.updatedBy ? ` by ${key.updatedBy.name}` : ""}
                    </p>
                  ) : null}
                </div>
                {!isEditing ? (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!data.encryptionConfigured || isBusy}
                      onClick={() => startEditing(key.provider)}
                    >
                      {key.source === "workspace" ? "Update" : "Add key"}
                    </Button>
                    {key.source === "workspace" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => remove(key.provider, key.label)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {isEditing ? (
                <form
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(key.provider, key.label);
                  }}
                >
                  <div className="relative flex-1">
                    <Input
                      type={showDraft ? "text" : "password"}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={`Paste the new ${key.label} API key`}
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus
                      aria-label={`New ${key.label} API key`}
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDraft((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showDraft ? "Hide key" : "Show key"}
                    >
                      {showDraft ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="h-9" disabled={isBusy}>
                      {isBusy ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-9" disabled={isBusy} onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              {rowError?.provider === key.provider ? (
                <p className="text-xs text-red-600 dark:text-red-400">{rowError.message}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
}
