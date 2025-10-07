import { cn } from "@/lib/utils";

interface TraloLogoProps {
  className?: string;
}

const TraloLogo = ({ className }: TraloLogoProps) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-foreground font-bold text-3xl italic">Tral</span>
      <div className="relative mx-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 7C6 5.34315 7.34315 4 9 4H11C12.6569 4 14 5.34315 14 7"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4 8L5 16H15L16 8H4Z"
              fill="white"
              stroke="white"
              strokeWidth="0.5"
            />
            <line x1="5.5" y1="11" x2="14.5" y2="11" stroke="#f97316" strokeWidth="1" />
            <line x1="6" y1="13.5" x2="14" y2="13.5" stroke="#f97316" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default TraloLogo;