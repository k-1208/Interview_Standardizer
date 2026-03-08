"use client";

import { Menu, Bell, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  title?: string;
  actions?: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Admissions Dashboard",
  "/candidates": "Candidate Database",
  "/upload": "Upload Student Application",
  "/review": "Review Extracted Information",
  "/export": "Export Interview Pack",
  "/interviews": "Interviews",
  "/settings": "Settings",
};

const DashboardHeader = ({ onToggleSidebar, sidebarOpen, title, actions }: DashboardHeaderProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle = title || pageTitles[pathname] || "Dashboard";

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-secondary/60 rounded-md px-3 py-1.5 w-56">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>

        {actions}

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            SC
          </div>
          <span className="hidden sm:block text-sm font-medium text-foreground">Dr. Sarah Chen</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/")}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;