import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, Undo2, AlertTriangle, FileText, Loader2 } from "lucide-react";

interface Expense {
    id: string;
    expense_number: string;
    vendor_name: string;
    amount: number;
    expense_date: string;
    category: string;
    description: string | null;
    payment_method: string | null;
    notes: string | null;
    status: string;
    is_reversed?: boolean;
    reversed_at?: string | null;
    reversal_reason?: string | null;
    created_at: string;
}

const ExpenseHistory = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [showReversalDialog, setShowReversalDialog] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [reversalReason, setReversalReason] = useState("");
    const [reversing, setReversing] = useState(false);

    const fetchExpenses = async () => {
        if (!user) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', user.id)
                .order('expense_date', { ascending: false })
                .limit(200);

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast({
                title: "Error",
                description: "Failed to load expense history. Please try again.",
                variant: "destructive",
            });
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, [user]);

    const handleRevertExpense = async () => {
        if (!selectedExpense || !reversalReason.trim()) {
            toast({
                title: "Missing Information",
                description: "Please provide a reason for reversing this expense.",
                variant: "destructive",
            });
            return;
        }

        if (selectedExpense.is_reversed) {
            toast({
                title: "Already Reversed",
                description: "This expense has already been reversed.",
                variant: "destructive",
            });
            return;
        }

        try {
            setReversing(true);

            const { error } = await supabase
                .from('expenses')
                .update({
                    is_reversed: true,
                    reversed_at: new Date().toISOString(),
                    reversal_reason: reversalReason.trim(),
                    status: 'reversed'
                })
                .eq('id', selectedExpense.id)
                .eq('user_id', user!.id);

            if (error) throw error;

            toast({
                title: "Expense Reversed",
                description: `${selectedExpense.expense_number} has been reversed successfully.`,
            });

            setShowReversalDialog(false);
            setSelectedExpense(null);
            setReversalReason("");
            fetchExpenses();
        } catch (error) {
            console.error('Error reversing expense:', error);
            toast({
                title: "Reversal Failed",
                description: "Failed to reverse the expense. Please try again.",
                variant: "destructive",
            });
        } finally {
            setReversing(false);
        }
    };

    const openReversalDialog = (expense: Expense) => {
        setSelectedExpense(expense);
        setShowReversalDialog(true);
        setReversalReason("");
    };

    const filteredExpenses = expenses.filter((expense) => {
        const matchesSearch = !searchTerm.trim()
            ? true
            : expense.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
            categoryFilter === "all" ? true : expense.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(expenses.map(e => e.category))).sort();

    const getStatusBadge = (expense: Expense) => {
        if (expense.is_reversed) {
            return <Badge variant="destructive">Reversed</Badge>;
        }

        switch (expense.status) {
            case 'recorded':
                return <Badge variant="default">Recorded</Badge>;
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'reimbursed':
                return <Badge variant="outline">Reimbursed</Badge>;
            default:
                return <Badge variant="outline">{expense.status}</Badge>;
        }
    };

    return (
        <>
            <Card className="rounded-2xl border border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Expense History
                    </CardTitle>
                    <CardDescription>
                        View all recorded expenses and reverse them if needed (one-time reversal only)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search expenses..."
                                className="pl-9"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                            Loading expense history...
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No expenses found</p>
                            <p className="text-sm">Record your first expense to see it here.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Expense #</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id} className={expense.is_reversed ? 'opacity-60' : ''}>
                                            <TableCell className="text-sm">
                                                {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {expense.expense_number}
                                            </TableCell>
                                            <TableCell>{expense.vendor_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{expense.category}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                ¢{expense.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {expense.payment_method || '--'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(expense)}</TableCell>
                                            <TableCell>
                                                {!expense.is_reversed ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openReversalDialog(expense)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Undo2 className="w-4 h-4 mr-1" />
                                                        Revert
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Reversed {expense.reversed_at && format(new Date(expense.reversed_at), 'MMM dd')}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            Reverse Expense
                        </DialogTitle>
                        <DialogDescription>
                            This action is permanent and can only be done once per expense. The expense will be marked as reversed and excluded from reports.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedExpense && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Expense Number:</span>
                                    <span className="font-medium">{selectedExpense.expense_number}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Vendor:</span>
                                    <span className="font-medium">{selectedExpense.vendor_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-semibold text-red-600">¢{selectedExpense.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span>{format(new Date(selectedExpense.expense_date), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reversal-reason">Reason for Reversal *</Label>
                                <Textarea
                                    id="reversal-reason"
                                    value={reversalReason}
                                    onChange={(e) => setReversalReason(e.target.value)}
                                    placeholder="Explain why this expense is being reversed..."
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowReversalDialog(false)}
                            disabled={reversing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRevertExpense}
                            disabled={reversing || !reversalReason.trim()}
                        >
                            {reversing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Reversing...
                                </>
                            ) : (
                                <>
                                    <Undo2 className="w-4 h-4 mr-2" />
                                    Confirm Reversal
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ExpenseHistory;
