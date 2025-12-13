import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Download,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import { useSalesSummaryData } from "@/hooks/useSalesSummaryData";
import { useReportsDownload } from "@/hooks/useReportsDownload";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";

const SalesSummary = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const { summaryData, performanceInsights, loading, refreshData } = useSalesSummaryData();
  const { generateSalesReport, generateFinancialStatement } = useReportsDownload();
  const { monthlyGoodsTraded, loading: metricsLoading } = useHomeMetrics();

  const averageDailyRevenue = monthlyGoodsTraded > 0 ? monthlyGoodsTraded / new Date().getDate() : 0;

  const currentData = summaryData[selectedPeriod] || {
    revenue: "0.00",
    cost: "0.00",
    expenses: "0.00",
    miscellaneous: "0.00",
    credit: "0.00",
    moneyOwed: "0.00",
    profit: "0.00"
  };

  const handleCloseDay = () => {
    toast({
      title: "📊 Daily Report Generated!",
      description: "Your sales summary for today has been saved and is ready for download.",
    });
  };

  const handleDownloadReport = async () => {
    await generateSalesReport(selectedPeriod);
  };

  const handleDownloadFinancialStatement = async () => {
    await generateFinancialStatement(selectedPeriod);
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      today: "Today",
      week: "This Week",
      month: "This Month",
      quarter: "This Quarter",
      year: "This Year",
      overall: "Overall History"
    };
    return labels[period as keyof typeof labels];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales Summary</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Track your business performance and profitability</p>
            <TrustScoreBadge size="sm" />
          </div>
        </div>

        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="overall">Overall History</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {selectedPeriod === "today" && (
            <Button onClick={handleCloseDay} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Close for Day
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Revenue</span>
              </div>
              <div className="text-2xl font-bold text-green-600">₵{currentData.revenue}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Cost</span>
              </div>
              <div className="text-2xl font-bold text-red-600">₵{currentData.cost}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Credit Sales</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">₵{currentData.credit}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Profit</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">₵{currentData.profit}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {getPeriodLabel(selectedPeriod)} Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-green-700 dark:text-green-300">💰 Income</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-semibold text-green-600">₵{currentData.revenue}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <span className="text-sm">Avg. Daily Revenue (MTD)</span>
                    <span className="font-semibold text-green-600">
                      {metricsLoading ? "Calculating…" : `₵${Math.round(averageDailyRevenue).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-red-700 dark:text-red-300">💸 Expenses</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <span className="text-sm">Cost of Goods</span>
                    <span className="font-semibold text-red-600">₵{currentData.cost}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <span className="text-sm">Operating Expenses</span>
                    <span className="font-semibold text-red-600">₵{currentData.expenses}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <span className="text-sm">Miscellaneous Costs</span>
                    <span className="font-semibold text-red-600">₵{currentData.miscellaneous}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding & Credit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-orange-700 dark:text-orange-300">⏳ Outstanding (Credit Owed)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                    <span className="text-sm">Full Credit Sales</span>
                    <span className="font-semibold text-orange-600">₵{currentData.credit}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                    <span className="text-sm">Partial Payment Outstanding</span>
                    <span className="font-semibold text-orange-600">₵{currentData.moneyOwed}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <span className="text-sm font-medium">Total Outstanding</span>
                    <span className="font-bold text-red-600">₵{(parseFloat(currentData.credit.replace(',', '')) + parseFloat(currentData.moneyOwed.replace(',', ''))).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">📈 Profitability</h3>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Net Profit</span>
                    <Badge variant="default" className="bg-blue-600 text-white">
                      {Math.round((parseFloat(currentData.profit.replace(',', '')) / parseFloat(currentData.revenue.replace(',', ''))) * 100)}% margin
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">₵{currentData.profit}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleDownloadReport}
                variant="outline"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Download Sales Report
              </Button>

              <Button
                onClick={handleDownloadFinancialStatement}
                variant="outline"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Download Financial Statement
              </Button>

              {currentData.credit !== "0.00" && (
                <Button variant="secondary" className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Follow Up on Credits
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            📊 Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : performanceInsights.length > 0 ? (
              performanceInsights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border ${insight.type === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                    insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' :
                      'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  }`}>
                  <p className={`text-sm ${insight.type === 'success' ? 'text-green-800 dark:text-green-200' :
                      insight.type === 'warning' ? 'text-orange-800 dark:text-orange-200' :
                        'text-blue-800 dark:text-blue-200'
                    }`}>
                    {insight.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-lg bg-muted border">
                <p className="text-sm text-muted-foreground text-center">
                  📊 Start recording sales and expenses to get personalized performance insights.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesSummary;