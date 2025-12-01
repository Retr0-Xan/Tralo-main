import { useState } from "react";
import { Package, BarChart3, ClipboardCheck, FolderOpen, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import InventoryRecording from "@/components/inventory/InventoryRecording";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";
import InventoryGroupsManager from "@/components/inventory/InventoryGroupsManager";
import InventoryHistory from "@/components/inventory/InventoryHistory";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<"recording" | "dashboard" | "groups" | "history">("recording");
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Inventory Control"
        description="Capture stock receipts, reconciliations, and monitor availability."
        actions={
          <Button variant="outline" size="sm" className="rounded-xl border-border/70" onClick={() => setActiveTab("dashboard")}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        }
      />

      <Card className="rounded-2xl border border-border/70">
        <div className="flex flex-wrap gap-2 border-b border-border/60 bg-muted/30 p-2">
          <Button
            size="sm"
            variant={activeTab === "recording" ? "default" : "ghost"}
            onClick={() => {
              setActiveTab("recording");
              setSelectedGroup(null);
            }}
            className="rounded-xl px-4 py-2"
          >
            <Package className="mr-2 h-4 w-4" />
            Record Inventory
          </Button>
          <Button
            size="sm"
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
            className="rounded-xl px-4 py-2"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Inventory Analytics
          </Button>
          <Button
            size="sm"
            variant={activeTab === "groups" ? "default" : "ghost"}
            onClick={() => setActiveTab("groups")}
            className="rounded-xl px-4 py-2"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Inventory Groups
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="rounded-xl px-4 py-2"
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
        <CardContent className="px-4 py-6 md:px-6">
          {activeTab === "recording" ? (
            <InventoryRecording selectedGroup={selectedGroup} onGroupCleared={() => setSelectedGroup(null)} />
          ) : activeTab === "dashboard" ? (
            <InventoryDashboard />
          ) : activeTab === "history" ? (
            <InventoryHistory />
          ) : (
            <InventoryGroupsManager
              onSelectGroup={(group) => {
                setSelectedGroup(group);
                setActiveTab("recording");
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;