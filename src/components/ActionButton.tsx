import { ChevronRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

const ActionButton = ({ label, icon: Icon, variant = "primary", onClick }: ActionButtonProps) => {
  const baseStyles =
    "flex w-full items-center justify-between rounded-2xl border border-border/70 px-5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

  const variantStyles =
    variant === "primary"
      ? "bg-primary/10 hover:bg-primary/15 text-primary"
      : "bg-card hover:bg-card/90 text-foreground";

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`${baseStyles} ${variantStyles}`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold md:text-base">{label}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};

export default ActionButton;