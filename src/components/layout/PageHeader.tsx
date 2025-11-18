import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export const PageHeader = ({ icon: Icon, title, description, actions, className }: PageHeaderProps) => {
    return (
        <section
            className={cn(
                "flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-6 shadow-sm transition hover:shadow-md md:flex-row md:items-center md:justify-between",
                className,
            )}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <span className="rounded-xl sm:rounded-2xl bg-primary/15 p-2 sm:p-3 text-primary shadow-sm">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
                    {description && <p className="mt-1 text-sm text-muted-foreground md:text-base">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
        </section>
    );
};
