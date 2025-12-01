import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToSalesDataUpdates } from "@/lib/sales-events";
import { fetchSalesAnalytics } from "@/lib/sales-analytics";
import { Search, Info, Clock } from "lucide-react";

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
    createdAt: string;
    isPastSale: boolean;
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

            const purchases = await fetchSalesAnalytics(user.id, {
                includeReversed: true,
                limit: 250,
            });

            if (purchases.length === 0) {
                setRecords([]);
                setLoading(false);
                return;
            }

            const saleIds = purchases.map((purchase) => purchase.sale_id);

            const reversalResponse = saleIds.length
                ? await supabase
                    .from("sale_reversals")
                    .select("original_sale_id, reversal_reason, reversal_receipt_number, reversal_date")
                    .in("original_sale_id", saleIds)
                : { data: [] as any[] | null, error: null };

            if (reversalResponse.error) {
                throw reversalResponse.error;
            }

            // Fetch created_at timestamps from customer_purchases
            const createdAtResponse = saleIds.length
                ? await supabase
                    .from("customer_purchases")
                    .select("id, created_at")
                    .in("id", saleIds)
                : { data: [] as any[] | null, error: null };

            if (createdAtResponse.error) {
                throw createdAtResponse.error;
            }

            const reversalMap = new Map(
                (reversalResponse.data ?? []).map((reversal) => [reversal.original_sale_id, reversal])
            );

            const createdAtMap = new Map(
                (createdAtResponse.data ?? []).map((record) => [record.id, record.created_at])
            );

            const mapped: SaleHistoryRecord[] = purchases.map((purchase) => {
                const reversal = reversalMap.get(purchase.sale_id);
                const isReversed = purchase.is_reversed || Boolean(reversal);
                const status: SaleHistoryRecord["status"] = isReversed
                    ? "reverted"
                    : purchase.payment_method === "credit"
                        ? "credit"
                        : "completed";

                // Get created_at from the map
                const createdAtTimestamp = createdAtMap.get(purchase.sale_id) || purchase.purchase_date;

                // Determine if this is a past sale
                // Compare purchase_date with created_at - if they differ significantly, it's a past sale
                const purchaseDate = new Date(purchase.purchase_date);
                const createdAt = new Date(createdAtTimestamp);
                const timeDiffMs = Math.abs(createdAt.getTime() - purchaseDate.getTime());
                const timeDiffMinutes = timeDiffMs / (1000 * 60);
                // If created_at is more than 5 minutes after purchase_date, it's a past sale
                const isPastSale = timeDiffMinutes > 5;

                return {
                    id: purchase.sale_id,
                    productName: purchase.product_name,
                    amount: Number(purchase.effective_amount ?? purchase.amount ?? 0) || 0,
                    paymentMethod: purchase.payment_method || "cash",
                    purchaseDate: purchase.purchase_date,
                    customer: purchase.customer_phone || "Walk-in Customer",
                    status,
                    reversalReason: reversal?.reversal_reason ?? null,
                    reversalReceiptNumber: reversal?.reversal_receipt_number ?? null,
                    reversalDate: reversal?.reversal_date ?? null,
                    createdAt: createdAtTimestamp,
                    isPastSale,
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
                                    <TableRow
                                        key={record.id}
                                        className={record.isPastSale ? "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500" : ""}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {record.isPastSale && (
                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                )}
                                                {record.productName}
                                            </div>
                                        </TableCell>
                                        <TableCell>{record.customer}</TableCell>
                                        <TableCell>¢{record.amount.toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{record.paymentMethod}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getStatusBadgeVariant(record.status)}>
                                                    {getStatusLabel(record.status)}
                                                </Badge>
                                                {record.isPastSale && (
                                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                                        Past
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(record.purchaseDate).toLocaleString()}</TableCell>
                                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <span className="flex-1">
                                                    {record.status === "reverted"
                                                        ? record.reversalReason || "Reversal processed"
                                                        : record.status === "credit"
                                                            ? "Awaiting payment"
                                                            : record.isPastSale
                                                                ? "Recorded retrospectively"
                                                                : "--"}
                                                </span>
                                                {record.isPastSale && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                <Info className="h-4 w-4 text-amber-600" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle className="flex items-center gap-2">
                                                                    <Clock className="w-5 h-5 text-amber-600" />
                                                                    Past Sale Details
                                                                </DialogTitle>
                                                                <DialogDescription>
                                                                    This sale was recorded after it occurred
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-muted-foreground">Sale Date</p>
                                                                        <p className="text-sm font-semibold">
                                                                            {new Date(record.purchaseDate).toLocaleString()}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            When the sale actually happened
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-muted-foreground">Recorded On</p>
                                                                        <p className="text-sm font-semibold">
                                                                            {new Date(record.createdAt).toLocaleString()}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            When it was entered into the system
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                                                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                                                        ⚠️ This sale was recorded retrospectively, which means it occurred on a different date than when it was entered into the system.
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Product</p>
                                                                    <p className="text-sm">{record.productName}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-muted-foreground mb-2">Amount</p>
                                                                    <p className="text-sm">¢{record.amount.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
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
