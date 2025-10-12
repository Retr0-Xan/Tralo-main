import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTradeIndexData } from "@/hooks/useTradeIndexData";

const TradeInsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshData } = useTradeIndexData();
  const [analyzing, setAnalyzing] = useState(false);

  const triggerInventoryAnalysis = async () => {
    if (!user) return;

    setAnalyzing(true);
    try {
      toast({
        title: "Checking your inventory...",
        description: "Getting fresh insights for your business",
      });

      const { error } = await supabase.functions.invoke("supply-chain-analyzer", {
        body: { user_id: user.id },
      });

      if (error) throw error;

      await refreshData();

      toast({
        title: "Analysis done!",
        description: "Your data has been refreshed",
      });
    } catch (error) {
      console.error("Error analyzing inventory:", error);
      toast({
        title: "Error",
        description: "Could not analyze inventory. Try again later.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Trade Insights
          </span>
          <Button variant="outline" size="sm" onClick={triggerInventoryAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Analyze Now
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Detailed business, product, and market insight cards have been removed for a streamlined trade index
          experience. Use the button above whenever you need to refresh your underlying trade data.
        </p>
      </CardContent>
    </Card>
  );
};

export default TradeInsightsPage;
