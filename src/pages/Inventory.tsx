import { useState } from "react";
import { Package, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import InventoryRecording from "@/components/inventory/InventoryRecording";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<"recording" | "dashboard">("recording");
  const navigate = useNavigate();

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
        <h1 className="text-3xl font-bold text-foreground mb-6">Inventory Management</h1>
        
        {/* Toggle Bar */}
        <div className="flex bg-muted rounded-lg p-1 mb-6">
          <Button
            variant={activeTab === "recording" ? "default" : "ghost"}
            onClick={() => setActiveTab("recording")}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Record Inventory
          </Button>
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {activeTab === "recording" ? <InventoryRecording /> : <InventoryDashboard />}
      </div>
    </div>
  );
};

export default Inventory;