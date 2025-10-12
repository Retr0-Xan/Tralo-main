import { cn } from "@/lib/utils";
import logoWordmark from "@/assets/tralo-new-zoom.jpg";

interface TraloLogoProps {
  className?: string;
}

const TraloLogo = ({ className }: TraloLogoProps) => {
  return (
    <img
      src={logoWordmark}
      alt="Tralo"
      className={cn("h-12 w-auto object-contain", className)}
    />
  );
};

export default TraloLogo;