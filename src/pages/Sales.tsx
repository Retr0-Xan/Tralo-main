import { useState, useEffect } from "react";
import { Receipt, BarChart3, FileText, DollarSign, Users, Layers, LineChart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSearchParams } from "react-router-dom";
import SalesRecording from "@/components/sales/SalesRecording";
import SalesDashboard from "@/components/sales/SalesDashboard";
import SalesSummary from "@/components/sales/SalesSummary";
import ExpenseRecording from "@/components/expenses/ExpenseRecording";
import CustomerTrackingDialog from "@/components/sales/CustomerTrackingDialog";
import SaleReversalDialog from "@/components/sales/SaleReversalDialog";
import ClientValueRatioDisplay from "@/components/sales/ClientValueRatioDisplay";
import SalesHistory from "@/components/sales/SalesHistory";


const Sales = () => {
  const [activeTab, setActiveTab] = useState<"recording" | "dashboard" | "summary" | "expenses" | "customers" | "history">("recording");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'summary') {
      setActiveTab('summary');
    } else if (tab === 'expenses') {
      setActiveTab('expenses');
    } else if (tab === 'customers') {
      setActiveTab('customers');
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Sales & Revenue Management"
        description="Capture transactions, reconcile expenses, and analyse customer health."
        actions={<SaleReversalDialog />}
      />

      <Card className="rounded-2xl border border-border/70">
        <div className="grid gap-2 border-b border-border/60 bg-muted/30 p-2 md:grid-cols-3 lg:grid-cols-6">
          <Button
            size="sm"
            variant={activeTab === "recording" ? "default" : "ghost"}
            onClick={() => setActiveTab("recording")}
            className="rounded-xl px-4 py-2"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Record Sale
          </Button>
          <Button
            size="sm"
            variant={activeTab === "expenses" ? "default" : "ghost"}
            onClick={() => setActiveTab("expenses")}
            className="rounded-xl px-4 py-2"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
          <Button
            size="sm"
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
            className="rounded-xl px-4 py-2"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Sales Dashboard
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="rounded-xl px-4 py-2"
          >
            <Clock className="mr-2 h-4 w-4" />
            Sales History
          </Button>
          <Button
            size="sm"
            variant={activeTab === "summary" ? "default" : "ghost"}
            onClick={() => setActiveTab("summary")}
            className="rounded-xl px-4 py-2"
          >
            <FileText className="mr-2 h-4 w-4" />
            Daily Summary
          </Button>
          <Button
            size="sm"
            variant={activeTab === "customers" ? "default" : "ghost"}
            onClick={() => setActiveTab("customers")}
            className="rounded-xl px-4 py-2"
          >
            <Users className="mr-2 h-4 w-4" />
            Customer Tracking
          </Button>
        </div>
        <CardContent className="px-4 py-6 md:px-6">
          {activeTab === "recording" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <LineChart className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Fast capture mode enabled</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>Process reversals directly from the action bar.</span>
                </div>
              </div>
              <SalesRecording />
            </div>
          )}
          {activeTab === "expenses" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground">Business Expenses</h2>
                <p className="text-sm text-muted-foreground">Track and approve cost centres for accurate profitability.</p>
              </div>
              <ExpenseRecording onExpenseRecorded={() => { }} />
            </div>
          )}
          {activeTab === "dashboard" && <SalesDashboard />}
          {activeTab === "history" && <SalesHistory />}
          {activeTab === "summary" && <SalesSummary />}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground">Customer Sales Tracking</h2>
                <p className="text-sm text-muted-foreground">Monitor loyalty, highlight key accounts, and set follow-ups.</p>
              </div>
              <div className="flex justify-center">
                <CustomerTrackingDialog />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientValueRatioDisplay />
    </div>
  );
};

export default Sales;