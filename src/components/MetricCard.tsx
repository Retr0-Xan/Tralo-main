import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconBg?: string;
  helperText?: string;
}

const MetricCard = ({ title, value, icon: Icon, iconBg, helperText }: MetricCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/70 bg-card/90 p-4 sm:p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="pointer-events-none absolute -right-24 top-1/3 h-40 w-40 rotate-12 rounded-full bg-primary/5 blur-3xl transition group-hover:bg-primary/10" />

      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl text-lg font-semibold ${iconBg ?? "bg-primary/15 text-primary"
            }`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>

      <div className="mt-3 sm:mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">{title}</p>
        <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-semibold text-foreground md:text-[2.1rem]">{value}</p>
        {helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    </div>
  );
};

export default MetricCard;