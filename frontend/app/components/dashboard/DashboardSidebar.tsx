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

interface DashboardSidebarProps {
  open: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Candidate Database", path: "/candidates" },
  { icon: Upload, label: "Upload PDF", path: "/upload" },
  { icon: MessageSquare, label: "Interviews", path: "/interviews" },
  { icon: FileDown, label: "Exports", path: "/export" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const DashboardSidebar = ({ open, onToggle }: DashboardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative sidebar-gradient",
        "text-sidebar-fg",
        open ? "w-60" : "w-0 lg:w-16",
        !open && "overflow-hidden"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-14 px-4 border-b border-sidebar-border",
          open ? "justify-between" : "lg:justify-center"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Amber logo icon */}
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">IQ</span>
          </div>
          {open && (
            <span className="text-sm font-bold text-sidebar-fg-active whitespace-nowrap tracking-wide">
              InterviewIQ
            </span>
          )}
        </div>
        {/* Collapse toggle inline */}
        {open && (
          <button
            onClick={onToggle}
            className="lg:flex hidden w-6 h-6 rounded-full bg-sidebar-border/60 items-center justify-center hover:bg-sidebar-border transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-sidebar-fg" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-sidebar-accent/15 text-sidebar-fg-active font-medium"
                  : "text-sidebar-fg hover:text-sidebar-fg hover:bg-sidebar-border/40",
                !open && "lg:justify-center lg:px-0"
              )}
            >
              <item.icon
                className={cn("w-4 h-4 flex-shrink-0", active ? "text-sidebar-accent" : "text-sidebar-muted")}
                strokeWidth={1.5}
              />
              {open && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Expand button when collapsed */}
      {!open && (
        <button
          onClick={onToggle}
          className="hidden lg:flex mx-auto mb-4 w-6 h-6 rounded-full bg-sidebar-border/60 items-center justify-center hover:bg-sidebar-border transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-sidebar-fg rotate-180" />
        </button>
      )}
    </aside>
  );
};

export default DashboardSidebar;