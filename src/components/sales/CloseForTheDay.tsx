import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ArrowRight,
  Loader2,
  Lock,
} from "lucide-react";
import { useCloseForDay, DayClosureData } from "@/hooks/useCloseForDay";

// ── Star Display ───────────────────────────────────────────────
function StarDisplay({ rating, size = "lg" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${starSize} ${i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
            }`}
        />
      ))}
    </div>
  );
}

// ── Profit Display ─────────────────────────────────────────────
function ProfitResult({ data }: { data: DayClosureData }) {
  const isProfit = data.profit >= 0;
  return (
    <div className={`text-center p-6 rounded-2xl ${isProfit
        ? "bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800"
        : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800"
      }`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {isProfit ? (
          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
        ) : (
          <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
        )}
        <span className="text-sm font-medium text-muted-foreground">
          Today's Result
        </span>
      </div>
      <div className={`text-3xl md:text-4xl font-bold ${isProfit ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
        }`}>
        {isProfit
          ? `You made GHS ${data.profit.toFixed(2)} profit today`
          : `You made a loss of GHS ${Math.abs(data.profit).toFixed(2)} today`}
      </div>
    </div>
  );
}

// ── Business Score ─────────────────────────────────────────────
function BusinessScore({ data }: { data: DayClosureData }) {
  return (
    <div className="text-center p-4 rounded-xl bg-muted/50 border">
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Today's Business Performance
      </p>
      <div className="flex justify-center mb-2">
        <StarDisplay rating={data.starRating} />
      </div>
      <p className="text-lg font-semibold">{data.starLabel}</p>
    </div>
  );
}

// ── Advice Section ─────────────────────────────────────────────
function BusinessAdvice({ data }: { data: DayClosureData }) {
  return (
    <div className="space-y-4">
      {/* What Happened */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
          📊 What Happened Today
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-100">
          {data.message}
        </p>
      </div>

      {/* Quick Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">GHS {data.revenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
          <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-xs text-muted-foreground">Credit Sales</p>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{data.creditSales} sales</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs text-muted-foreground">Items Sold</p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{data.totalSalesCount} sales</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-xs text-muted-foreground">Cash In</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">GHS {data.cashAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/50 border">
          <p className="text-sm font-semibold mb-2">🏆 Top Sellers Today</p>
          <div className="space-y-1">
            {data.topProducts.slice(0, 3).map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.name}</span>
                <span className="font-medium">GHS {p.revenue.toFixed(2)} ({p.quantity} sold)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Customers */}
      {data.creditCustomers.length > 0 && (
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
            💳 Customers Who Owe You
          </p>
          <div className="space-y-1">
            {data.creditCustomers.slice(0, 3).map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-orange-900 dark:text-orange-100">{c.name}</span>
                <span className="font-medium text-orange-700 dark:text-orange-300">GHS {c.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Prescription ───────────────────────────────────────────────
function Prescription({ data }: { data: DayClosureData }) {
  const prescriptions: Record<string, string> = {
    'View Credit Customers': 'Try to collect money from customers who owe you, so cash can be stronger tomorrow.',
    'Review Prices': 'Check your prices — some items might be selling too cheap. Small price changes can mean more profit.',
    'View Slow Stock': 'Some items are sitting too long. Consider a small discount to move them and free up your money.',
    'See What Went Wrong': 'Look at where the money went today. Sometimes one big expense or one product pulls things down.',
    'See What Worked Today': 'You did well! See which products made you the most money so you can focus on them.',
    "View Today's Sales": 'Check your sales breakdown to know where your money came from today.',
  };

  const text = prescriptions[data.actionButton.label] || 'Review your sales and plan for a better tomorrow.';

  return (
    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">
        🩺 What You Should Do Next
      </p>
      <p className="text-sm text-amber-900 dark:text-amber-100">{text}</p>
    </div>
  );
}

// ── Closed Confirmation ────────────────────────────────────────
function ClosedConfirmation() {
  return (
    <div className="text-center p-6 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
      <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
      <p className="text-lg font-bold text-green-700 dark:text-green-300">
        Day closed successfully
      </p>
      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
        See you tomorrow 👋
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function CloseForTheDay() {
  const navigate = useNavigate();
  const { closeDay, closureData, isClosed, loading } = useCloseForDay();
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClose = async () => {
    const result = await closeDay();
    if (result) {
      // Show the results first, then confirmation after action
    }
  };

  const handleActionClick = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const handleDone = () => {
    setShowConfirmation(true);
    setTimeout(() => {
      setOpen(false);
      setShowConfirmation(false);
    }, 2500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          variant={isClosed ? "outline" : "default"}
        >
          {isClosed ? (
            <>
              <Lock className="w-4 h-4" />
              Day Closed
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Close for the Day
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isClosed && <Lock className="w-5 h-5 text-green-600" />}
            Close for the Day
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Calculating your day's performance...</p>
          </div>
        )}

        {/* No data yet — prompt to close */}
        {!loading && !closureData && (
          <div className="space-y-6 py-4">
            <div className="text-center p-6 rounded-xl bg-muted/50 border">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold mb-2">Ready to close your day?</p>
              <p className="text-sm text-muted-foreground">
                This will calculate your profit, show how your business did, and give you advice for tomorrow.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Close for the Day
            </Button>
          </div>
        )}

        {/* Show results */}
        {!loading && closureData && !showConfirmation && (
          <div className="space-y-4 py-2">
            <ProfitResult data={closureData} />
            <BusinessScore data={closureData} />
            <BusinessAdvice data={closureData} />
            <Prescription data={closureData} />

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={() => handleActionClick(closureData.actionButton.route)}
                className="w-full h-11 text-sm font-semibold"
                size="lg"
              >
                {closureData.actionButton.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {closureData.secondaryAction && (
                <Button
                  variant="outline"
                  onClick={() => handleActionClick(closureData.secondaryAction!.route)}
                  className="w-full h-10 text-sm"
                >
                  {closureData.secondaryAction.label}
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleDone}
                className="w-full text-sm text-muted-foreground"
              >
                Done for today
              </Button>
            </div>

            {isClosed && (
              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2">
                <Lock className="w-3 h-3" />
                <span>Daily figures locked for {new Date(closureData.date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {showConfirmation && <ClosedConfirmation />}
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Badge for already-closed indicator ──────────────────
export function DayClosedBadge() {
  const { isClosed, closureData } = useCloseForDay();

  if (!isClosed || !closureData) return null;

  return (
    <Badge
      variant="outline"
      className="gap-1 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50"
    >
      <StarDisplay rating={closureData.starRating} size="sm" />
      <span className="ml-1">{closureData.starLabel}</span>
    </Badge>
  );
}
