import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CreditCard,
  Target,
  Award,
  Lightbulb,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { useSalesData } from "@/hooks/useSalesData";
import { useSalesGoals } from "@/hooks/useSalesGoals";
import SalesGoalDialog from "./SalesGoalDialog";
import DailyProgressChart from "./DailyProgressChart";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import ShareMessageGenerator from "@/components/ShareMessageGenerator";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SalesDashboard = () => {
  const { user } = useAuth();
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  
  const { 
    salesMetrics, 
    cashFlow, 
    salesBreakdown, 
    salesTrends, 
    tradeInsights,
    loading, 
    refreshData 
  } = useSalesData();

  const { currentGoal, refreshGoal } = useSalesGoals();
  
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profileData, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setBusinessProfile(profileData);
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };

    fetchBusinessProfile();
  }, [user]);
  
  const handleGoalUpdate = () => {
    refreshGoal();
    refreshData();
  };

  // Get top 3 movers (highest quantity sold) and slow movers (lowest quantity sold)
  const topMovers = salesBreakdown.slice(0, 3);
  const slowMovers = salesBreakdown.slice(-2).reverse(); // Reverse to show slowest first

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800';
      default: return 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'restock_alert': return '📦';
      case 'pricing_alert': return '💰';
      case 'market_trend': return '📈';
      case 'demand_alert': return '⚠️';
      default: return '💡';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Fast Mover": "bg-green-100 text-green-800 border-green-200",
      "Stable": "bg-blue-100 text-blue-800 border-blue-200",
      "Running Low": "bg-orange-100 text-orange-800 border-orange-200",
      "Slow Mover": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Very Slow": "bg-red-100 text-red-800 border-red-200"
    };
    
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors]}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Sales Dashboard</h2>
          <p className="text-muted-foreground">Loading your sales data...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales Dashboard</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Track your sales performance and insights</p>
            <TrustScoreBadge size="sm" />
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Sales Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Today's Sales</span>
            </div>
            <div className="text-2xl font-bold text-green-600">¢{salesMetrics.todaySales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">¢{salesMetrics.weekSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">This Month</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">¢{salesMetrics.monthSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Items Sold Today</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{salesMetrics.itemsSoldToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Best Seller (Week)</span>
            </div>
            <div className="text-lg font-bold">{salesMetrics.bestSellerWeek.product}</div>
            <div className="text-sm text-muted-foreground">{salesMetrics.bestSellerWeek.quantity} sold</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Slow Seller (Week)</span>
            </div>
            <div className="text-lg font-bold">{salesMetrics.slowSellerWeek.product}</div>
            <div className="text-sm text-muted-foreground">{salesMetrics.slowSellerWeek.quantity} sold</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-800 dark:text-yellow-200">💡 Quick Tip</div>
              <p className="text-sm text-muted-foreground mt-1">
                {salesMetrics.bestSellerWeek.product !== "No sales" 
                  ? `${salesMetrics.bestSellerWeek.product} is your best seller this week. Monitor stock levels and check trade index before restocking.`
                  : "Start recording sales to see personalized insights and tips based on your business performance."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Cash Flow Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="text-sm font-medium text-green-800 dark:text-green-200">Total Cash Collected</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">¢{cashFlow.totalCash}</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <div className="text-sm font-medium text-orange-800 dark:text-orange-200">Pending (Credit)</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">¢{cashFlow.pending}</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Debt Cleared</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">¢{cashFlow.debtCleared}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Items</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Revenue (¢)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesBreakdown.map((item) => (
                <TableRow key={item.item}>
                  <TableCell className="font-medium">{item.item}</TableCell>
                  <TableCell>{item.unitsSold}</TableCell>
                  <TableCell>¢{item.revenue}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top & Slow Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top 3 Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMovers.map((item, index) => (
                <div key={item.item} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{item.item}</span>
                  </div>
                  <div className="text-sm text-green-600">{item.unitsSold} sold</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Slow Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowMovers.map((item) => (
                <div key={item.item} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <span className="font-medium">{item.item}</span>
                  <div className="text-sm text-red-600">{item.unitsSold} sold</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Sales Trends (Week vs Last Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesTrends.length > 0 ? (
            <div className="space-y-3">
              {salesTrends.map((trend) => (
                <div key={trend.product} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    {trend.isPositive === true && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {trend.isPositive === false && <TrendingDown className="w-4 h-4 text-red-600" />}
                    {trend.isPositive === null && <BarChart3 className="w-4 h-4 text-blue-600" />}
                    <span className="font-medium">{trend.product}:</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{trend.trend}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Record more sales to see trend analysis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sales Goal Progress and Daily Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Sales Target Tracking
              </div>
              <SalesGoalDialog onGoalUpdate={handleGoalUpdate} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentGoal ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {currentGoal.goal_type ? (currentGoal.goal_type.charAt(0).toUpperCase() + currentGoal.goal_type.slice(1)) : 'Monthly'} Target: ¢{Number(currentGoal.target_amount).toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ¢{currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                      currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                      currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales} / ¢{Number(currentGoal.target_amount).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={Math.min((Number(
                    currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                    currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                    currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales
                  ) / Number(currentGoal.target_amount)) * 100, 100)} 
                  className="h-3" 
                />
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    {Math.round((Number(
                      currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                      currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                      currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales
                    ) / Number(currentGoal.target_amount)) * 100)}% complete
                    {Number(
                      currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                      currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                      currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales
                    ) >= Number(currentGoal.target_amount) ? " - Target achieved! 🎉" : " - Keep going! 🎯"}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">🔥 To Target</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      {Number(
                        currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                        currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                        currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales
                      ) >= Number(currentGoal.target_amount)
                        ? "Target achieved!" 
                        : `¢${(Number(currentGoal.target_amount) - Number(
                            currentGoal.goal_type === 'monthly' ? salesMetrics.monthSales : 
                            currentGoal.goal_type === 'weekly' ? salesMetrics.weekSales :
                            currentGoal.goal_type === 'daily' ? salesMetrics.todaySales : salesMetrics.monthSales
                          )).toFixed(2)} left`}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-200">📅 Time Period</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {new Date(currentGoal.period_start).toLocaleDateString()} - {new Date(currentGoal.period_end).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No sales target set</p>
                <p className="text-sm text-muted-foreground/80 mb-4">
                  Set a sales target to track your progress and stay motivated
                </p>
                <SalesGoalDialog onGoalUpdate={handleGoalUpdate} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Progress Chart */}
        <DailyProgressChart goalId={currentGoal?.id} />
      </div>

      {/* Share Message Generator */}
      <ShareMessageGenerator
          businessName={businessProfile?.business_name || "Your Business"}
          location={businessProfile?.business_address || "Your Location"}
          phoneNumber={businessProfile?.phone_number || "Your Phone Number"}
          items={salesBreakdown
            .filter(item => item.item && item.revenue) // Filter out invalid items
            .map(item => {
              const revenueStr = item.revenue?.toString().replace(/[¢,]/g, '') || '0';
              const revenueNum = Number(revenueStr);
              const unitPrice = item.unitsSold > 0 ? (revenueNum / item.unitsSold).toFixed(2) : '0';
              return {
                name: item.item,
                price: unitPrice,
                unit: "each"
              };
            })}
          type="sales"
        />

        {/* Trade Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              🧠 AI Trade Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradeInsights.length > 0 ? (
              <div className="space-y-3">
                {tradeInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border border-border ${getPriorityColor(insight.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getInsightIcon(insight.insight_type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{insight.product_name}</span>
                          <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Record more sales to get personalized trade insights
                </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  AI will analyze your sales patterns and provide market recommendations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
};

export default SalesDashboard;