import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

const ActionButton = ({ label, icon: Icon, variant = "primary", onClick }: ActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className={`w-full py-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
        variant === "primary"
          ? "bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary"
          : "bg-secondary hover:bg-card text-secondary-foreground border border-border"
      }`}
    >
      <Icon className="w-6 h-6 mr-3" />
      {label}
    </Button>
  );
};

export default ActionButton;