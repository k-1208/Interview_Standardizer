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
  Shield,
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
        "sidebar-gradient text-sidebar-fg flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border relative",
        open ? "w-60" : "w-0 lg:w-16",
        !open && "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-sidebar-border", !open && "lg:justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-accent-foreground" />
        </div>
        {open && <span className="text-sm font-semibold text-sidebar-fg-active whitespace-nowrap">InterviewIQ</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150",
                active
                  ? "bg-sidebar-accent/15 text-sidebar-fg-active font-medium"
                  : "text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-border/40",
                !open && "lg:justify-center lg:px-0"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {open && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Toggle (desktop only) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-card border border-border items-center justify-center shadow-soft hover:shadow-card transition-shadow"
      >
        <ChevronLeft className={cn("w-3 h-3 text-foreground transition-transform duration-300", !open && "rotate-180")} />
      </button>
    </aside>
  );
};

export default DashboardSidebar;