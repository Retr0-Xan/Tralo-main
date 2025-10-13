import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Search, Undo2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentShare } from "@/hooks/useDocumentShare";

interface ReversalReceiptsHistoryProps {
    onBack: () => void;
}

interface SaleReversalRow {
    id: string;
    original_sale_id: string;
    reversal_reason: string | null;
    reversal_receipt_number: string;
    reversal_date: string;
}

interface CustomerPurchaseRow {
    id: string;
    product_name: string;
    amount: number;
    customer_phone: string;
    payment_method: string | null;
    purchase_date: string;
}

interface InventoryMovementRow {
    sale_id: string | null;
    product_name: string;
    quantity: number | null;
    selling_price: number | null;
}

interface ReversalDocumentRow {
    id: string;
    document_number: string;
    total_amount: number | null;
    content: any;
    customer_name: string | null;
}

interface ReversalRecord {
    id: string;
    receiptNumber: string;
    productName: string;
    quantity: number;
    totalAmount: number;
    customer: string;
    paymentMethod: string;
    reversalReason: string;
    reversalDate: string;
    documentContent: any;
}

const ReversalReceiptsHistory = ({ onBack }: ReversalReceiptsHistoryProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { downloadDocument } = useDocumentShare();

    const [records, setRecords] = useState<ReversalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchReversalData = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const { data: reversalData, error: reversalError } = await supabase
                    .from('sale_reversals')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('reversal_date', { ascending: false });

                if (reversalError) throw reversalError;

                const reversalRows = (reversalData || []) as SaleReversalRow[];

                if (reversalRows.length === 0) {
                    setRecords([]);
                    return;
                }

                const saleIds = reversalRows.map((row) => row.original_sale_id);

                const salesResponse = saleIds.length
                    ? await supabase
                        .from('customer_purchases')
                        .select('*')
                        .in('id', saleIds)
                    : { data: [] as any[] | null, error: null };

                const movementsResponse = saleIds.length
                    ? await supabase
                        .from('inventory_movements')
                        .select('sale_id, product_name, quantity, selling_price')
                        .eq('user_id', user.id)
                        .in('sale_id', saleIds)
                        .eq('movement_type', 'sold')
                    : { data: [] as any[] | null, error: null };

                const documentsResponse = reversalRows.length
                    ? await supabase
                        .from('documents')
                        .select('id, document_number, total_amount, content, customer_name')
                        .eq('user_id', user.id)
                        .eq('document_type', 'reversal_receipt')
                        .in('document_number', reversalRows.map((row) => row.reversal_receipt_number))
                    : { data: [] as any[] | null, error: null };

                if (salesResponse.error) throw salesResponse.error;
                if (movementsResponse.error) throw movementsResponse.error;
                if (documentsResponse.error) throw documentsResponse.error;

                const salesMap = new Map(
                    ((salesResponse.data || []) as CustomerPurchaseRow[]).map((sale) => [sale.id, sale])
                );
                const movementsBySale = new Map<string, InventoryMovementRow[]>();

                ((movementsResponse.data || []) as InventoryMovementRow[]).forEach((movement) => {
                    const saleId = movement.sale_id || '';
                    if (!movementsBySale.has(saleId)) {
                        movementsBySale.set(saleId, []);
                    }
                    movementsBySale.get(saleId)!.push(movement);
                });

                const documentsMap = new Map(
                    ((documentsResponse.data || []) as ReversalDocumentRow[]).map((doc) => [doc.document_number, doc])
                );

                const combinedRecords: ReversalRecord[] = reversalRows.map((reversal) => {
                    const sale = salesMap.get(reversal.original_sale_id);
                    const saleMovements = movementsBySale.get(reversal.original_sale_id) || [];
                    const doc = documentsMap.get(reversal.reversal_receipt_number);

                    const quantity = saleMovements.reduce((sum, move) => sum + Math.max(0, Number(move.quantity ?? 0)), 0);
                    const totalAmountFromMovements = saleMovements.reduce(
                        (sum, move) => sum + Math.max(0, Number(move.selling_price ?? 0)) * Math.max(0, Number(move.quantity ?? 0)),
                        0
                    );

                    const documentContent = (() => {
                        if (!doc?.content) return null;
                        if (typeof doc.content === 'string') {
                            try {
                                return JSON.parse(doc.content);
                            } catch (error) {
                                console.error('Failed to parse reversal document content', error);
                                return doc.content;
                            }
                        }
                        return doc.content;
                    })();

                    return {
                        id: reversal.id,
                        receiptNumber: reversal.reversal_receipt_number,
                        productName:
                            saleMovements[0]?.product_name || sale?.product_name || 'Unknown Product',
                        quantity: quantity || 1,
                        totalAmount:
                            Number(doc?.total_amount ?? 0) ||
                            (totalAmountFromMovements || Number(sale?.amount ?? 0)),
                        customer: doc?.customer_name || sale?.customer_phone || 'Walk-in Customer',
                        paymentMethod: sale?.payment_method || 'cash',
                        reversalReason: reversal.reversal_reason || 'N/A',
                        reversalDate: reversal.reversal_date,
                        documentContent,
                    };
                });

                setRecords(combinedRecords);
            } catch (error) {
                console.error('Error loading reversal receipts:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load reversal receipts. Please try again.',
                    variant: 'destructive',
                });
                setRecords([]);
            } finally {
                setLoading(false);
            }
        };

        fetchReversalData();
    }, [toast, user]);

    const filteredRecords = useMemo(() => {
        if (!search.trim()) return records;
        const query = search.trim().toLowerCase();
        return records.filter((record) => {
            return (
                record.receiptNumber.toLowerCase().includes(query) ||
                record.productName.toLowerCase().includes(query) ||
                record.customer.toLowerCase().includes(query) ||
                record.reversalReason.toLowerCase().includes(query)
            );
        });
    }, [records, search]);

    const handleDownload = (record: ReversalRecord) => {
        if (!record.receiptNumber) {
            toast({
                title: 'Document Missing',
                description: 'Reversal receipt number not found for this record.',
                variant: 'destructive',
            });
            return;
        }

        downloadDocument({
            documentNumber: record.receiptNumber,
            documentType: 'Reversal Receipt',
            customerName: record.customer,
            totalAmount: record.totalAmount,
            documentContent: record.documentContent,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Undo2 className="w-5 h-5" />
                    Reversal Receipts
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sale Reversals</CardTitle>
                    <CardDescription>Receipts generated when sales were reversed</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search by receipt number, product, or customer"
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading reversal receipts...
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Undo2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p>No reversal receipts found.</p>
                            <p className="text-sm">Reverse a sale to generate a receipt automatically.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Receipt #</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.receiptNumber}</TableCell>
                                            <TableCell>{record.productName}</TableCell>
                                            <TableCell>{record.quantity}</TableCell>
                                            <TableCell>¢{record.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell>{record.customer}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{record.reversalReason}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(record.reversalDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownload(record)}
                                                    title="Download reversal receipt"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ReversalReceiptsHistory;
