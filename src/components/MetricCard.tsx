import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
}

const MetricCard = ({ title, value, icon: Icon, iconBg }: MetricCardProps) => {
  return (
    <div className="bg-card hover:bg-card-hover border border-border rounded-xl p-6 shadow-card transition-all duration-300 hover:scale-105">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-card-foreground/80 text-sm font-medium mb-2">{title}</h3>
      <p className="text-card-foreground text-2xl font-bold">{value}</p>
    </div>
  );
};

export default MetricCard;