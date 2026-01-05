import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, CheckCircle, Clock, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreditSale {
    id: string;
    customer_name: string;
    customer_phone: string;
    product_name: string;
    total_amount: number;
    amount_paid: number;
    remaining_balance: number;
    payment_status: string;
    sale_date: string;
    payment_history: PaymentRecord[];
}

interface PaymentRecord {
    amount: number;
    date: string;
    payment_method: string;
}

const CreditManagement = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | string>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        fetchCreditSales();
    }, [user]);

    const fetchCreditSales = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch business profile first
            const { data: profile } = await supabase
                .from('business_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!profile) {
                setCreditSales([]);
                setLoading(false);
                return;
            }

            console.log('Fetching credit sales for business:', profile.id);

            // Fetch credit and partial payment sales from customer_purchases
            const { data, error } = await supabase
                .from('customer_purchases')
                .select('*')
                .eq('business_id', profile.id)
                .in('payment_status', ['credit', 'partial_payment'])
                .order('purchase_date', { ascending: false });

            if (error) throw error;

            console.log('Fetched credit sales:', data);

            // Transform data to CreditSale format
            const salesData: CreditSale[] = (data || []).map((purchase: any) => ({
                id: purchase.id,
                customer_name: purchase.customer_phone === 'walk-in' ? 'Walk-in Customer' : purchase.customer_phone,
                customer_phone: purchase.customer_phone,
                product_name: purchase.product_name,
                total_amount: purchase.amount,
                amount_paid: purchase.amount_paid || 0,
                remaining_balance: purchase.amount - (purchase.amount_paid || 0),
                payment_status: purchase.payment_status || 'credit',
                sale_date: purchase.purchase_date,
                payment_history: purchase.payment_history || [],
            }));

            console.log('Transformed credit sales:', salesData);

            setCreditSales(salesData);
        } catch (error) {
            console.error('Error fetching credit sales:', error);
            toast({
                title: "Error",
                description: "Failed to load credit sales",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const recordPayment = async () => {
        if (!selectedSale || !paymentAmount) {
            toast({
                title: "Error",
                description: "Please enter a valid payment amount",
                variant: "destructive",
            });
            return;
        }

        const paymentNum = typeof paymentAmount === 'string' ? parseFloat(paymentAmount) : paymentAmount;

        if (paymentNum <= 0 || paymentNum > selectedSale.remaining_balance) {
            toast({
                title: "Error",
                description: `Payment must be between ¢0 and ¢${selectedSale.remaining_balance.toFixed(2)}`,
                variant: "destructive",
            });
            return;
        }

        try {
            const newAmountPaid = selectedSale.amount_paid + paymentNum;

            console.log('Recording payment:', {
                saleId: selectedSale.id,
                previousAmountPaid: selectedSale.amount_paid,
                paymentAmount: paymentNum,
                newAmountPaid: newAmountPaid,
                totalAmount: selectedSale.total_amount,
            });

            const paymentRecord: PaymentRecord = {
                amount: paymentNum,
                date: new Date().toISOString(),
                payment_method: paymentMethod,
            };

            const updatedHistory = [...selectedSale.payment_history, paymentRecord];

            const { data, error } = await supabase
                .from('customer_purchases')
                .update({
                    amount_paid: newAmountPaid,
                    payment_history: updatedHistory,
                    // payment_status will be updated automatically by the trigger
                })
                .eq('id', selectedSale.id)
                .select();

            if (error) throw error;

            console.log('Payment recorded successfully:', data);

            const newBalance = selectedSale.total_amount - newAmountPaid;

            toast({
                title: "Payment Recorded",
                description: `¢${paymentNum.toFixed(2)} payment recorded successfully${newBalance <= 0 ? '. Credit cleared!' : ''}`,
            });

            setDialogOpen(false);
            setSelectedSale(null);
            setPaymentAmount(0);

            // Wait a bit for the trigger to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            fetchCreditSales();
        } catch (error) {
            console.error('Error recording payment:', error);
            toast({
                title: "Error",
                description: "Failed to record payment",
                variant: "destructive",
            });
        }
    };

    const getTotalOutstanding = () => {
        return creditSales.reduce((sum, sale) => sum + sale.remaining_balance, 0);
    };

    if (loading) {
        return <div className="p-6">Loading credit sales...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                <p className="text-2xl font-bold text-red-600">¢{getTotalOutstanding().toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Credit Sales</p>
                                <p className="text-2xl font-bold">{creditSales.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Partial Payments</p>
                                <p className="text-2xl font-bold">
                                    {creditSales.filter(s => s.payment_status === 'partial_payment').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Credit Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Credit & Partial Payment Sales</CardTitle>
                </CardHeader>
                <CardContent>
                    {creditSales.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No outstanding credit or partial payments</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{sale.customer_name}</span>
                                                <span className="text-xs text-muted-foreground">{sale.customer_phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{sale.product_name}</TableCell>
                                        <TableCell>¢{sale.total_amount.toFixed(2)}</TableCell>
                                        <TableCell>¢{sale.amount_paid.toFixed(2)}</TableCell>
                                        <TableCell className="font-bold text-red-600">
                                            ¢{sale.remaining_balance.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={sale.payment_status === 'credit' ? 'destructive' : 'secondary'}>
                                                {sale.payment_status === 'credit' ? 'Full Credit' : 'Partial'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Dialog open={dialogOpen && selectedSale?.id === sale.id} onOpenChange={(open) => {
                                                setDialogOpen(open);
                                                if (!open) {
                                                    setSelectedSale(null);
                                                    setPaymentAmount(0);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedSale(sale);
                                                            setDialogOpen(true);
                                                        }}
                                                    >
                                                        Record Payment
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Record Payment</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Customer:</span>
                                                                <span className="font-medium">{sale.customer_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Product:</span>
                                                                <span className="font-medium">{sale.product_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Total Amount:</span>
                                                                <span className="font-medium">¢{sale.total_amount.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Already Paid:</span>
                                                                <span className="font-medium">¢{sale.amount_paid.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                                                <span>Remaining Balance:</span>
                                                                <span className="text-red-600">¢{sale.remaining_balance.toFixed(2)}</span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="payment">Payment Amount (¢)</Label>
                                                            <Input
                                                                id="payment"
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                max={sale.remaining_balance}
                                                                value={paymentAmount}
                                                                onChange={(e) => setPaymentAmount(e.target.value ? parseFloat(e.target.value) : 0)}
                                                                placeholder="Enter amount"
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label>Payment Method</Label>
                                                            <select
                                                                className="w-full p-2 border rounded-md"
                                                                value={paymentMethod}
                                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                            >
                                                                <option value="cash">Cash</option>
                                                                <option value="mobile money">Mobile Money</option>
                                                                <option value="bank transfer">Bank Transfer</option>
                                                            </select>
                                                        </div>

                                                        <Button onClick={recordPayment} className="w-full">
                                                            Record Payment
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CreditManagement;
