import { cn } from "@/lib/utils";
import logoLight from "@/assets/tralo-new-zoom-removebg-preview.png";
import logoDark from "@/assets/tralo-logo-dark-mode-removebg-preview.png";

interface TraloLogoProps {
  className?: string;
}

const TraloLogo = ({ className }: TraloLogoProps) => {
  return (
    <div className="inline-flex items-center">
      <img
        src={logoLight}
        alt="Tralo"
        className={cn("h-12 w-auto object-contain dark:hidden", className)}
      />
      <img
        src={logoDark}
        alt="Tralo"
        className={cn("hidden h-12 w-auto object-contain dark:block", className)}
      />
    </div>
  );
};

export default TraloLogo;