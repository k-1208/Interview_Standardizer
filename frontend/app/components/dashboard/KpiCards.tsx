import type { ElementType } from "react";
import { Users, FileText, MessageSquare, Clock } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  caption?: string;
}

interface KpiCardsProps {
  kpisData?: {
    dashboard?: {
      kpis?: {
        totalCandidates?: number;
        pendingCandidates?: number;
        reviewedCandidates?: number;
        pendingInvitations?: number;
      };
    };
  };
  isLoading?: boolean;
}

const KpiCard = ({ title, value, icon: Icon, caption }: KpiCardProps) => (
  <div className="kpi-card">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm text-muted-foreground">{title}</p>
      <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0" strokeWidth={1.5} />
    </div>
    <p className="text-[32px] leading-none font-semibold tracking-tight text-foreground mt-4">{value}</p>
    {caption ? <p className="text-xs text-muted-foreground mt-3">{caption}</p> : null}
  </div>
);

const KpiCards = ({ kpisData, isLoading = false }: KpiCardsProps) => {
  const kpis = kpisData?.dashboard?.kpis;
  const cards: KpiCardProps[] = [
    {
      title: "Total candidates",
      value: kpis?.totalCandidates ?? 0,
      icon: Users,
      caption: "Across all active applications",
    },
    {
      title: "Pending review",
      value: kpis?.pendingCandidates ?? 0,
      icon: FileText,
      caption: "Needs evaluator attention",
    },
    {
      title: "Interview ready",
      value: kpis?.reviewedCandidates ?? 0,
      icon: MessageSquare,
      caption: "Ready for scheduling",
    },
    {
      title: "Pending invitations",
      value: kpis?.pendingInvitations ?? 0,
      icon: Clock,
      caption: "Awaiting candidate response",
    },
  ];

  if (isLoading && !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="kpi-card h-[132px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
};

export default KpiCards;
