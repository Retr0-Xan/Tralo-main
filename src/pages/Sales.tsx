import { useState, useEffect } from "react";
import { Receipt, BarChart3, FileText, Users, Layers, LineChart, Clock, CalendarClock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useSearchParams } from "react-router-dom";
import SalesRecording from "@/components/sales/SalesRecording";
import SalesDashboard from "@/components/sales/SalesDashboard";
import SalesSummary from "@/components/sales/SalesSummary";
import CustomerTracking from "@/components/sales/CustomerTracking";
import SaleReversalDialog from "@/components/sales/SaleReversalDialog";
import ClientValueRatioDisplay from "@/components/sales/ClientValueRatioDisplay";
import SalesHistory from "@/components/sales/SalesHistory";
import PastSalesRecording from "@/components/documents/PastSalesRecording";
import CreditManagement from "@/components/sales/CreditManagement";


const Sales = () => {
  const [activeTab, setActiveTab] = useState<"recording" | "dashboard" | "summary" | "customers" | "history" | "past-sales" | "credit">("recording");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'summary') {
      setActiveTab('summary');
    } else if (tab === 'customers') {
      setActiveTab('customers');
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        title="Sales & Revenue Management"
        description="Capture transactions, track customer relationships, and analyze sales performance."
        actions={<SaleReversalDialog />}
      />

      <Card className="rounded-2xl border border-border/70">
        <div className="grid gap-2 border-b border-border/60 bg-muted/30 p-2 md:grid-cols-3 lg:grid-cols-7">
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
            variant={activeTab === "past-sales" ? "default" : "ghost"}
            onClick={() => setActiveTab("past-sales")}
            className="rounded-xl px-4 py-2"
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Past Sale
          </Button>
          <Button
            size="sm"
            variant={activeTab === "credit" ? "default" : "ghost"}
            onClick={() => setActiveTab("credit")}
            className="rounded-xl px-4 py-2"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Credit & Partial
          </Button>
          <Button
            size="sm"
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
            className="rounded-xl px-4 py-2"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="rounded-xl px-4 py-2"
          >
            <Clock className="mr-2 h-4 w-4" />
            History
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
            Customers
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
          {activeTab === "past-sales" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-foreground">Recording Past Sales</p>
                    <p className="text-xs text-muted-foreground">Sales will be timestamped with both the sale date and recording date</p>
                  </div>
                </div>
              </div>
              <PastSalesRecording />
            </div>
          )}
          {activeTab === "dashboard" && <SalesDashboard />}
          {activeTab === "history" && <SalesHistory />}
          {activeTab === "summary" && <SalesSummary />}
          {activeTab === "customers" && <CustomerTracking />}
          {activeTab === "credit" && <CreditManagement />}
        </CardContent>
      </Card>

      <ClientValueRatioDisplay />
    </div>
  );
};

export default Sales;