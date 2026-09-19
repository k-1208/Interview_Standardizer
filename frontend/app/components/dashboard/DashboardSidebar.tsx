"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  MessageSquare,
  FileDown,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatRole } from "@/lib/display";

interface DashboardSidebarProps {
  open: boolean;
  onToggle: () => void;
  userName?: string;
  userRole?: string;
}

const workspaceItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: Users, label: "Candidates", path: "/candidates" },
  { icon: MessageSquare, label: "Interviews", path: "/interviews" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: FileDown, label: "Exports", path: "/export" },
];

const adminItems = [{ icon: Settings, label: "Settings", path: "/settings" }];

const DashboardSidebar = ({ open, onToggle, userName, userRole }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = userName || "User";

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const renderItems = (items: typeof workspaceItems) =>
    items.map((item) => {
      const active = isActive(item.path);
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => router.push(item.path)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            active
              ? "bg-sidebar-active text-sidebar-fg-active font-medium"
              : "text-sidebar-fg hover:text-sidebar-fg-active hover:bg-sidebar-hover",
            !open && "lg:justify-center lg:px-0"
          )}
        >
          <item.icon
            className={cn("w-4 h-4 flex-shrink-0", active ? "text-sidebar-fg-active" : "text-sidebar-muted")}
            strokeWidth={1.5}
          />
          {open && <span className="whitespace-nowrap">{item.label}</span>}
        </button>
      );
    });

  return (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col bg-surface text-sidebar-fg border-r border-sidebar-border",
        "fixed inset-y-0 left-0 z-40 lg:static",
        open ? "translate-x-0 w-60" : "-translate-x-full w-60 lg:translate-x-0 lg:w-16",
        !open && "lg:overflow-hidden"
      )}
    >
      <div
        className={cn(
          "flex items-center h-14 px-4 border-b border-sidebar-border",
          open ? "justify-between" : "lg:justify-center"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">IQ</span>
          </div>
          {open && (
            <span className="text-sm font-semibold text-sidebar-fg-active whitespace-nowrap">InterviewIQ</span>
          )}
        </div>
        {open && (
          <button
            type="button"
            onClick={onToggle}
            className="lg:flex hidden w-6 h-6 rounded-full bg-sidebar-hover items-center justify-center hover:bg-sidebar-active transition-colors flex-shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-sidebar-fg" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        <div>
          {open && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
              Workspace
            </p>
          )}
          <div className="space-y-0.5">{renderItems(workspaceItems)}</div>
        </div>

        <div>
          {open && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
              Admin
            </p>
          )}
          <div className="space-y-0.5">{renderItems(adminItems)}</div>
        </div>
      </nav>

      {!open && (
        <button
          type="button"
          onClick={onToggle}
          className="hidden lg:flex mx-auto mb-3 w-6 h-6 rounded-full bg-sidebar-hover items-center justify-center hover:bg-sidebar-active transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-sidebar-fg rotate-180" />
        </button>
      )}

      <div className={cn("border-t border-sidebar-border p-3", !open && "lg:px-2")}>
        <div className={cn("flex items-center gap-2.5 min-w-0", !open && "lg:justify-center")}>
          <InitialsAvatar name={displayName} />
          {open && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-fg-active truncate">{displayName}</p>
              <p className="text-xs text-sidebar-muted truncate">{formatRole(userRole)}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
