"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredToken, getStoredToken, me, type MeResponse } from "@/api/auth";

export const SELECTED_WORKSPACE_KEY = "selected_workspace_id";

type WorkspaceContextValue = {
  meData: MeResponse | null;
  selectedWorkspaceId: number | undefined;
  setSelectedWorkspaceId: (workspaceId: number) => void;
  refreshMe: () => Promise<void>;
  isLoading: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [meData, setMeData] = useState<MeResponse | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const data = await me();
    setMeData(data);

    const storedRaw = window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
    const storedId = storedRaw ? Number(storedRaw) : undefined;
    const validStored =
      storedId && data.workspaces.some((m) => m.workspace.id === storedId) ? storedId : undefined;
    const nextId = validStored ?? data.workspaces[0]?.workspace.id;

    setSelectedWorkspaceIdState(nextId);
    if (nextId) {
      window.localStorage.setItem(SELECTED_WORKSPACE_KEY, String(nextId));
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        await refreshMe();
      } catch {
        if (isMounted) {
          clearStoredToken();
          router.replace("/");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [router, refreshMe]);

  const setSelectedWorkspaceId = useCallback(
    (workspaceId: number) => {
      setSelectedWorkspaceIdState(workspaceId);
      window.localStorage.setItem(SELECTED_WORKSPACE_KEY, String(workspaceId));

      if (pathname?.startsWith("/candidate/")) {
        router.push("/dashboard");
      }
    },
    [pathname, router]
  );

  const value = useMemo(
    () => ({
      meData,
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      refreshMe,
      isLoading,
    }),
    [meData, selectedWorkspaceId, setSelectedWorkspaceId, refreshMe, isLoading]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
