import { useState } from "react";
import { DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import ExpenseRecording from "@/components/expenses/ExpenseRecording";
import ExpenseHistory from "@/components/expenses/ExpenseHistory";

const Expenses = () => {
    const [activeTab, setActiveTab] = useState<"recording" | "history">("recording");

    return (
        <div className="space-y-6">
            <PageHeader
                icon={DollarSign}
                title="Business Expenses"
                description="Track and manage all business expenses for accurate profitability analysis."
            />

            <Card className="rounded-2xl border border-border/70">
                <div className="grid gap-2 border-b border-border/60 bg-muted/30 p-2 md:grid-cols-2">
                    <Button
                        size="sm"
                        variant={activeTab === "recording" ? "default" : "ghost"}
                        onClick={() => setActiveTab("recording")}
                        className="rounded-xl px-4 py-2"
                    >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Record Expense
                    </Button>
                    <Button
                        size="sm"
                        variant={activeTab === "history" ? "default" : "ghost"}
                        onClick={() => setActiveTab("history")}
                        className="rounded-xl px-4 py-2"
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        View History
                    </Button>
                </div>
                <CardContent className="px-4 py-6 md:px-6">
                    {activeTab === "recording" && <ExpenseRecording onExpenseRecorded={() => { }} />}
                    {activeTab === "history" && <ExpenseHistory />}
                </CardContent>
            </Card>
        </div>
    );
};

export default Expenses;
