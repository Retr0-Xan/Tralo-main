import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import { Search } from "lucide-react";

interface SaleHistoryRecord {
    id: string;
    productName: string;
    amount: number;
    paymentMethod: string;
    purchaseDate: string;
    customer: string;
    status: "completed" | "credit" | "reverted";
    reversalReason: string | null;
    reversalReceiptNumber: string | null;
    reversalDate: string | null;
}

const getStatusBadgeVariant = (status: SaleHistoryRecord["status"]) => {
    switch (status) {
        case "completed":
            return "default";
        case "credit":
            return "secondary";
        case "reverted":
            return "destructive";
        default:
            return "outline";
    }
};

const getStatusLabel = (status: SaleHistoryRecord["status"]) => {
    switch (status) {
        case "completed":
            return "Completed";
        case "credit":
            return "Pending (Credit)";
        case "reverted":
            return "Reverted";
        default:
            return status;
    }
};

const SalesHistory = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<SaleHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchHistory = useCallback(async () => {
        if (!user) {
            setRecords([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const { data: profile, error: profileError } = await supabase
                .from("business_profiles")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!profile) {
                setRecords([]);
                setLoading(false);
                return;
            }

            const { data: purchases, error: purchasesError } = await supabase
                .from("customer_purchases")
                .select("*")
                .eq("business_id", profile.id)
                .order("purchase_date", { ascending: false })
                .limit(250);

            if (purchasesError) {
                throw purchasesError;
            }

            const saleIds = (purchases ?? []).map((purchase) => purchase.id);

            const reversalResponse = saleIds.length
                ? await supabase
                    .from("sale_reversals")
                    .select("original_sale_id, reversal_reason, reversal_receipt_number, reversal_date")
                    .in("original_sale_id", saleIds)
                : { data: [] as any[] | null, error: null };

            if (reversalResponse.error) {
                throw reversalResponse.error;
            }

            const reversalMap = new Map(
                (reversalResponse.data ?? []).map((reversal) => [reversal.original_sale_id, reversal])
            );

            const mapped: SaleHistoryRecord[] = (purchases ?? []).map((purchase) => {
                const reversal = reversalMap.get(purchase.id);
                const status: SaleHistoryRecord["status"] = reversal
                    ? "reverted"
                    : purchase.payment_method === "credit"
                        ? "credit"
                        : "completed";

                return {
                    id: purchase.id,
                    productName: purchase.product_name,
                    amount: Number(purchase.amount) || 0,
                    paymentMethod: purchase.payment_method || "cash",
                    purchaseDate: purchase.purchase_date,
                    customer: purchase.customer_phone || "Walk-in Customer",
                    status,
                    reversalReason: reversal?.reversal_reason ?? null,
                    reversalReceiptNumber: reversal?.reversal_receipt_number ?? null,
                    reversalDate: reversal?.reversal_date ?? null,
                };
            });

            setRecords(mapped);
        } catch (error) {
            console.error("Error fetching sales history:", error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const unsubscribe = subscribeToSalesDataUpdates(() => {
            fetchHistory();
        });
        return unsubscribe;
    }, [user, fetchHistory]);

    const filteredRecords = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return records.filter((record) => {
            const matchesSearch = !query
                ? true
                : record.productName.toLowerCase().includes(query) ||
                record.customer.toLowerCase().includes(query) ||
                record.reversalReceiptNumber?.toLowerCase().includes(query) ||
                record.paymentMethod.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === "all" ? true : record.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [records, searchTerm, statusFilter]);

    return (
        <Card className="rounded-2xl border border-border/70">
            <CardHeader>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>Review all recorded sales and their current status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by product, customer, payment or receipt"
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-48">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="credit">Pending (Credit)</SelectItem>
                            <SelectItem value="reverted">Reverted</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground">Loading sales history...</div>
                ) : filteredRecords.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        No sales records found matching your criteria.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">{record.productName}</TableCell>
                                        <TableCell>{record.customer}</TableCell>
                                        <TableCell>¢{record.amount.toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{record.paymentMethod}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(record.status)}>
                                                {getStatusLabel(record.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(record.purchaseDate).toLocaleString()}</TableCell>
                                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                                            {record.status === "reverted"
                                                ? record.reversalReason || "Reversal processed"
                                                : record.status === "credit"
                                                    ? "Awaiting payment"
                                                    : "--"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SalesHistory;
