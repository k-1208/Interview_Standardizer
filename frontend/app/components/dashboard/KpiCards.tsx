import { Users, FileText, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}

const KpiCard = ({ title, value, icon: Icon, trend, trendUp }: KpiCardProps) => (
  <div className="kpi-card">
    <div className="flex items-start justify-between mb-3">
      <span className="text-sm text-muted-foreground font-medium leading-snug">{title}</span>
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-2">
        <Icon className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
      </div>
    </div>
    <div className="text-3xl font-bold text-foreground">{value}</div>
    {trend && (
      <p className={cn("text-xs mt-1.5 font-medium", trendUp ? "text-emerald-600" : "text-muted-foreground")}>
        {trend}
      </p>
    )}
  </div>
);

const kpis: KpiCardProps[] = [
  { title: "Total Candidates", value: 248, icon: Users, trend: "+12 this month", trendUp: true },
  { title: "Parsed This Week", value: 34, icon: FileText, trend: "+8 vs last week", trendUp: true },
  { title: "Interviews Ready", value: 18, icon: MessageSquare, trend: "5 scheduled today" },
  { title: "Pending Reviews", value: 7, icon: Clock, trend: "3 high priority" },
];

const KpiCards = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {kpis.map((kpi) => (
      <KpiCard key={kpi.title} {...kpi} />
    ))}
  </div>
);

export default KpiCards;