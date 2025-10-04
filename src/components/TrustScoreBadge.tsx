import { Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTrustScore } from "@/hooks/useTrustScore";

interface TrustScoreBadgeProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showLabel?: boolean;
}

const TrustScoreBadge = ({ 
  size = "md", 
  showIcon = true, 
  showLabel = true 
}: TrustScoreBadgeProps) => {
  const { trustScore, loading } = useTrustScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500 text-white";
    if (score >= 60) return "bg-yellow-500 text-white";
    if (score >= 40) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Building";
  };

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <Shield className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  };

  const iconClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  return (
    <Badge 
      className={`${getScoreColor(trustScore)} ${sizeClasses[size]} flex items-center gap-1 font-medium`}
    >
      {showIcon && (
        trustScore >= 60 ? 
          <TrendingUp className={iconClasses[size]} /> : 
          <Shield className={iconClasses[size]} />
      )}
      <span>Trust {trustScore}%</span>
      {showLabel && size !== "sm" && (
        <span className="opacity-90">• {getScoreLabel(trustScore)}</span>
      )}
    </Badge>
  );
};

export default TrustScoreBadge;