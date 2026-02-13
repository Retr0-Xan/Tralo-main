import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, AlertTriangle, Clock, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dispatchSalesDataUpdated } from "@/lib/sales-events";
import CustomerAutofill from "@/components/sales/CustomerAutofill";

interface InventoryProduct {
    id: string;
    product_name: string;
    current_stock: number;
    selling_price: number;
}

interface SaleItem {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    isFromInventory: boolean;
    productId?: string;
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
    const [salesItems, setSalesItems] = useState<SaleItem[]>([]);

    // Current item being added
    const [productName, setProductName] = useState("");
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [customProductName, setCustomProductName] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [unitPrice, setUnitPrice] = useState<number | string>(0);
    const [discount, setDiscount] = useState<number | string>(0);

    // Customer and payment details
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
            const product = inventoryProducts.find(p => p.product_name.toLowerCase() === value.toLowerCase());
            if (product) {
                setUnitPrice(product.selling_price);
            }
        }
    };

    const addItemToSale = () => {
        const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        const unitPriceNum = typeof unitPrice === 'string' ? parseFloat(unitPrice) : unitPrice;
        const discountNum = typeof discount === 'string' ? parseFloat(discount) : discount;

        if ((!isCustomProduct && !productName) || (isCustomProduct && !customProductName) || !quantityNum || quantityNum <= 0 || !unitPriceNum || unitPriceNum <= 0) {
            toast({
                title: "Error",
                description: "Please fill in all required fields with valid values.",
                variant: "destructive",
            });
            return;
        }

        const finalProductName = isCustomProduct ? customProductName : productName;
        const product = inventoryProducts.find(p => p.product_name.toLowerCase() === finalProductName.toLowerCase());

        const itemTotal = (quantityNum * unitPriceNum) - (discountNum || 0);

        const newItem: SaleItem = {
            id: Date.now().toString(),
            productName: finalProductName,
            quantity: quantityNum,
            unitPrice: unitPriceNum,
            discount: discountNum || 0,
            total: itemTotal,
            isFromInventory: !isCustomProduct,
            productId: product?.id
        };

        setSalesItems([...salesItems, newItem]);

        // Reset current item fields
        setProductName("");
        setIsCustomProduct(false);
        setCustomProductName("");
        setQuantity(1);
        setUnitPrice(0);
        setDiscount(0);

        toast({
            title: "Item Added",
            description: `${finalProductName} has been added to the sale.`,
        });
    };

    const removeItem = (itemId: string) => {
        setSalesItems(salesItems.filter(item => item.id !== itemId));
        toast({
            title: "Item Removed",
            description: "Item has been removed from the sale.",
        });
    };

    const calculateSubtotal = () => {
        return salesItems.reduce((sum, item) => sum + item.total, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal();
    };

    const calculateTaxes = () => {
        if (!applyTaxes) return 0;
        return calculateSubtotal() * 0.20; // 20% total tax
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

        if (!saleDate || salesItems.length === 0) {
            toast({
                title: "Error",
                description: "Please select a date and add at least one item to the sale",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            // Combine date and time
            let saleDateTimeString = saleDate;
            if (saleTime) {
                saleDateTimeString = `${saleDate}T${saleTime}`;
            }
            const saleDateTime = new Date(saleDateTimeString).toISOString();
            const recordedAt = new Date().toISOString(); // Current timestamp

            const subtotal = calculateSubtotal();
            const totalTax = calculateTaxes();
            const total = subtotal + totalTax;

            // Calculate individual tax components (using 20% total: VAT 15%, NHIL 2.5%, GETFund 2.5%)
            const itemVAT = applyTaxes ? totalTax * (0.15 / 0.20) : 0;
            const itemNHIL = applyTaxes ? totalTax * (0.025 / 0.20) : 0;
            const itemGETFund = applyTaxes ? totalTax * (0.025 / 0.20) : 0;

            // Record each item as a separate sale entry
            for (const item of salesItems) {
                const itemSubtotal = item.total;
                const itemTotalTax = applyTaxes ? itemSubtotal * 0.20 : 0;
                const itemTotal = itemSubtotal + itemTotalTax;

                const { error: purchaseError } = await supabase
                    .from('customer_purchases')
                    .insert({
                        business_id: businessProfile.id,
                        product_name: item.productName,
                        customer_name: customerName || (customerPhone ? customerPhone : 'Walk-in Customer'),
                        customer_phone: customerPhone || 'walk-in',
                        amount: itemSubtotal,
                        quantity: item.quantity,
                        payment_method: paymentMethod,
                        purchase_date: saleDateTime,
                        vat_amount: applyTaxes ? itemTotalTax * (0.15 / 0.20) : 0,
                        nhil_amount: applyTaxes ? itemTotalTax * (0.025 / 0.20) : 0,
                        getfund_amount: applyTaxes ? itemTotalTax * (0.025 / 0.20) : 0,
                        covid19_amount: 0,
                        total_tax: itemTotalTax,
                        created_at: recordedAt,
                    });

                if (purchaseError) throw purchaseError;

                // If product is from inventory, update stock
                if (item.isFromInventory && item.productId) {
                    const product = inventoryProducts.find(p => p.id === item.productId);
                    if (product) {
                        const { error: updateError } = await supabase
                            .from('user_products')
                            .update({
                                current_stock: Math.max(0, product.current_stock - item.quantity),
                                last_sale_date: saleDateTime,
                            })
                            .eq('id', product.id);

                        if (updateError) console.error('Error updating inventory:', updateError);
                    }
                }
            }

            // Generate past sale receipt with special markers
            const receiptNumber = `PS-${Date.now().toString().slice(-6)}`;

            try {
                const receiptData = {
                    businessProfile,
                    items: salesItems.map(item => ({
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        total: item.total,
                        isFromInventory: item.isFromInventory,
                        unitOfMeasure: 'units'
                    })),
                    customer: {
                        name: customerName || customerPhone || 'Walk-in Customer',
                        phone: customerPhone || 'N/A'
                    },
                    subtotal,
                    totalTax,
                    total,
                    paymentMethod,
                    paymentStatus: 'paid',
                    applyTaxes,
                    notes: notes || '',
                    date: saleDateTime,
                    // Past sale markers
                    isPastSale: true,
                    recordedAt,
                    receiptNumber,
                    // Flag to indicate if time was provided
                    includeTime: !!saleTime
                };

                const { data: receiptHtml, error: receiptError } = await supabase.functions.invoke('generate-receipt', {
                    body: receiptData,
                });

                if (!receiptError && receiptHtml) {
                    // Download the receipt
                    const htmlContent = typeof receiptHtml === 'string' ? receiptHtml : JSON.stringify(receiptHtml);
                    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `past_sale_receipt_${receiptNumber}.html`;
                    document.body.appendChild(a);
                    a.click();

                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);
                }
            } catch (receiptError) {
                console.error('Error generating past sale receipt:', receiptError);
                // Don't fail the whole operation if receipt generation fails
            }

            dispatchSalesDataUpdated();

            toast({
                title: "Past sale recorded",
                description: `Sale from ${new Date(saleDateTime).toLocaleString()} has been recorded`,
            });

            // Reset form
            setSaleDate("");
            setSaleTime("");
            setSalesItems([]); // Reset items array
            setProductName("");
            setCustomProductName("");
            setQuantity(1);
            setUnitPrice(0);
            setDiscount(0);
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sale Date & Time Section */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-sm">Sale Date & Time</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

                    {/* Add Item Section */}
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add Item to Sale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="product">Product</Label>
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantity</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
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
                                        onChange={(e) => setUnitPrice(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discount">Discount (¢)</Label>
                                    <Input
                                        id="discount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={addItemToSale}
                                className="w-full"
                                variant="outline"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item to Sale
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Items List */}
                    {salesItems.length > 0 && (
                        <Card className="border-2 border-green-500/20">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Items in Sale ({salesItems.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {salesItems.map((item) => (
                                        <div key={item.id} className="p-3 border rounded-lg bg-muted/30 hover:border-primary/50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{item.productName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.quantity} × ¢{item.unitPrice.toFixed(2)}
                                                        {item.isFromInventory && <span className="ml-2 text-primary">(From Inventory)</span>}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeItem(item.id)}
                                                    className="h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                {item.discount > 0 && (
                                                    <span className="text-xs text-muted-foreground">-¢{item.discount.toFixed(2)} discount</span>
                                                )}
                                                <span className="font-semibold text-sm ml-auto">¢{item.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Customer & Payment Details */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-sm">Customer & Payment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <CustomerAutofill
                                customerName={customerName}
                                customerPhone={customerPhone}
                                onCustomerNameChange={setCustomerName}
                                onCustomerPhoneChange={setCustomerPhone}
                                nameLabel="Customer Name (Optional)"
                                phoneLabel="Customer Phone (Optional)"
                            />

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
                                    Apply Taxes (20% - VAT 15%, NHIL 2.5%, GETFund 2.5%)
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
                        </CardContent>
                    </Card>

                    {/* Totals Summary */}
                    {salesItems.length > 0 && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 border-2">
                            <div className="flex justify-between">
                                <span className="text-sm">Subtotal:</span>
                                <span className="font-semibold">¢{calculateSubtotal().toFixed(2)}</span>
                            </div>
                            {applyTaxes && (
                                <div className="flex justify-between text-sm">
                                    <span>Taxes (20%):</span>
                                    <span>¢{calculateTaxes().toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                <span>Total:</span>
                                <span>¢{calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>This entry will be timestamped as recorded at: {new Date().toLocaleString()}</span>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || salesItems.length === 0}
                        className="w-full"
                    >
                        {loading ? "Recording..." : `Record Past Sale (${salesItems.length} items)`}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default PastSalesRecording;
