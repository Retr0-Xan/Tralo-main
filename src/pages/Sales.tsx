import { useState, useEffect } from "react";
import { Receipt, BarChart3, FileText, ArrowLeft, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import SalesRecording from "@/components/sales/SalesRecording";
import SalesDashboard from "@/components/sales/SalesDashboard";
import SalesSummary from "@/components/sales/SalesSummary";
import ExpenseRecording from "@/components/expenses/ExpenseRecording";
import CustomerTrackingDialog from "@/components/sales/CustomerTrackingDialog";
import SaleReversalDialog from "@/components/sales/SaleReversalDialog";
import ClientValueRatioDisplay from "@/components/sales/ClientValueRatioDisplay";


const Sales = () => {
  const [activeTab, setActiveTab] = useState<"recording" | "dashboard" | "summary" | "expenses" | "customers">("recording");
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-6">Sales Management</h1>
        
        {/* Toggle Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 bg-muted rounded-lg p-1 mb-6 gap-1">
          <Button
            variant={activeTab === "recording" ? "default" : "ghost"}
            onClick={() => setActiveTab("recording")}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <Receipt className="w-4 h-4" />
            Record Sale
          </Button>
          <Button
            variant={activeTab === "expenses" ? "default" : "ghost"}
            onClick={() => setActiveTab("expenses")}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <DollarSign className="w-4 h-4" />
            Record Expense
          </Button>
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Sales Dashboard
          </Button>
          <Button
            variant={activeTab === "summary" ? "default" : "ghost"}
            onClick={() => setActiveTab("summary")}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" />
            Sales Summary
          </Button>
          <Button
            variant={activeTab === "customers" ? "default" : "ghost"}
            onClick={() => setActiveTab("customers")}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <Users className="w-4 h-4" />
            Customer Tracking
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {activeTab === "recording" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <SaleReversalDialog />
            </div>
            <SalesRecording />
          </div>
        )}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Business Expenses</h2>
              <p className="text-muted-foreground">Track and manage all your business expenses</p>
            </div>
            <ExpenseRecording onExpenseRecorded={() => {
              // Refresh any data if needed
            }} />
          </div>
        )}
        {activeTab === "dashboard" && <SalesDashboard />}
        {activeTab === "summary" && <SalesSummary />}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Customer Sales Tracking</h2>
              <p className="text-muted-foreground">Manage your customers and track their purchases</p>
            </div>
            <div className="flex justify-center">
              <CustomerTrackingDialog />
            </div>
          </div>
        )}
      </div>

      {/* Client-Value Ratio Display */}
      <ClientValueRatioDisplay />
    </div>
  );
};

export default Sales;