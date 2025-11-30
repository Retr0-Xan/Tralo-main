import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dispatchSalesDataUpdated } from "@/lib/sales-events";

interface InventoryProduct {
    id: string;
    product_name: string;
    current_stock: number;
    selling_price: number;
}

const PastSalesRecording = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);

    // Sale details
    const [saleDate, setSaleDate] = useState("");
    const [saleTime, setSaleTime] = useState("");
    const [productName, setProductName] = useState("");
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [customProductName, setCustomProductName] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [unitPrice, setUnitPrice] = useState<number | string>(0);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [applyTaxes, setApplyTaxes] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'mobile money' | 'bank transfer'>('cash');
    const [notes, setNotes] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const { data: profileData } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                setBusinessProfile(profileData);

                const { data: inventoryData } = await supabase
                    .from('user_products')
                    .select('*')
                    .eq('user_id', user.id);

                setInventoryProducts(inventoryData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [user]);

    const handleProductChange = (value: string) => {
        if (value === "custom") {
            setIsCustomProduct(true);
            setProductName("");
            setUnitPrice(0);
        } else {
            setIsCustomProduct(false);
            setProductName(value);
            const product = inventoryProducts.find(p => p.product_name === value);
            if (product) {
                setUnitPrice(product.selling_price);
            }
        }
    };

    const calculateTotal = () => {
        const qty = Number(quantity) || 0;
        const price = Number(unitPrice) || 0;
        return qty * price;
    };

    const calculateTaxes = () => {
        if (!applyTaxes) return 0;
        return calculateTotal() * 0.21; // 21% total tax
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!businessProfile) {
            toast({
                title: "Error",
                description: "Business profile not found",
                variant: "destructive",
            });
            return;
        }

        if (!saleDate || !productName && !customProductName) {
            toast({
                title: "Error",
                description: "Please fill in required fields",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            const finalProductName = isCustomProduct ? customProductName : productName;

            // Combine date and time
            let saleDateTimeString = saleDate;
            if (saleTime) {
                saleDateTimeString = `${saleDate}T${saleTime}`;
            }
            const saleDateTime = new Date(saleDateTimeString).toISOString();
            const recordedAt = new Date().toISOString(); // Current timestamp

            const subtotal = calculateTotal();
            const totalTax = calculateTaxes();
            const total = subtotal + totalTax;

            // Calculate individual tax components
            const itemVAT = applyTaxes ? totalTax * (0.15 / 0.21) : 0;
            const itemNHIL = applyTaxes ? totalTax * (0.025 / 0.21) : 0;
            const itemGETFund = applyTaxes ? totalTax * (0.025 / 0.21) : 0;
            const itemCovid19 = applyTaxes ? totalTax * (0.01 / 0.21) : 0;

            // Record the past sale
            const { error: purchaseError } = await supabase
                .from('customer_purchases')
                .insert({
                    business_id: businessProfile.id,
                    product_name: finalProductName,
                    customer_phone: customerPhone || 'walk-in',
                    amount: subtotal,
                    quantity: Number(quantity),
                    payment_method: paymentMethod,
                    purchase_date: saleDateTime,
                    vat_amount: itemVAT,
                    nhil_amount: itemNHIL,
                    getfund_amount: itemGETFund,
                    covid19_amount: itemCovid19,
                    total_tax: totalTax,
                    created_at: recordedAt, // Record when it was entered into system
                });

            if (purchaseError) throw purchaseError;

            // If product is from inventory, update stock
            const product = inventoryProducts.find(p => p.product_name === finalProductName);
            if (product) {
                const { error: updateError } = await supabase
                    .from('user_products')
                    .update({
                        current_stock: Math.max(0, product.current_stock - Number(quantity)),
                        last_sale_date: saleDateTime,
                    })
                    .eq('id', product.id);

                if (updateError) console.error('Error updating inventory:', updateError);
            }

            dispatchSalesDataUpdated();

            toast({
                title: "Past sale recorded",
                description: `Sale from ${new Date(saleDateTime).toLocaleString()} has been recorded`,
            });

            // Reset form
            setSaleDate("");
            setSaleTime("");
            setProductName("");
            setCustomProductName("");
            setQuantity(1);
            setUnitPrice(0);
            setCustomerName("");
            setCustomerPhone("");
            setApplyTaxes(false);
            setNotes("");
            setIsCustomProduct(false);

        } catch (error) {
            console.error('Error recording past sale:', error);
            toast({
                title: "Error",
                description: "Failed to record past sale",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Record Past Sale
                </CardTitle>
                <CardDescription>
                    Record sales that occurred on previous days. The system will timestamp when this entry was made.
                </CardDescription>
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg mt-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Recording past sales will affect historical reports and analytics</span>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="saleDate">
                                Sale Date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="saleDate"
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="saleTime">Sale Time (Optional)</Label>
                            <Input
                                id="saleTime"
                                type="time"
                                value={saleTime}
                                onChange={(e) => setSaleTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product">
                            Product <span className="text-destructive">*</span>
                        </Label>
                        {!isCustomProduct ? (
                            <Select value={productName} onValueChange={handleProductChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product or enter custom" />
                                </SelectTrigger>
                                <SelectContent>
                                    {inventoryProducts.map((product) => (
                                        <SelectItem key={product.id} value={product.product_name}>
                                            {product.product_name} (Stock: {product.current_stock})
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Custom Product</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter product name"
                                    value={customProductName}
                                    onChange={(e) => setCustomProductName(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCustomProduct(false);
                                        setCustomProductName("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">Unit Price (¢)</Label>
                            <Input
                                id="unitPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name (Optional)</Label>
                            <Input
                                id="customerName"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
                            <Input
                                id="customerPhone"
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="mobile money">Mobile Money</SelectItem>
                                <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                                <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="applyTaxes"
                            checked={applyTaxes}
                            onCheckedChange={(checked) => setApplyTaxes(!!checked)}
                        />
                        <Label htmlFor="applyTaxes" className="cursor-pointer">
                            Apply Taxes (21% - VAT 15%, NHIL 2.5%, GETFund 2.5%, COVID-19 1%)
                        </Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes about this sale..."
                        />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">Subtotal:</span>
                            <span className="font-semibold">¢{calculateTotal().toFixed(2)}</span>
                        </div>
                        {applyTaxes && (
                            <div className="flex justify-between text-sm">
                                <span>Taxes (21%):</span>
                                <span>¢{calculateTaxes().toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>¢{(calculateTotal() + calculateTaxes()).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>This entry will be timestamped as recorded at: {new Date().toLocaleString()}</span>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Recording..." : "Record Past Sale"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default PastSalesRecording;
