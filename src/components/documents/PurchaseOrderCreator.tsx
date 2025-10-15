import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";

interface PurchaseOrderCreatorProps {
    onBack: () => void;
    onSuccess: () => void;
}

interface InventoryItem {
    id: string;
    product_name: string;
    current_stock: number;
    selling_price?: number | null;
}

const PurchaseOrderCreator = ({ onBack, onSuccess }: PurchaseOrderCreatorProps) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { generatePurchaseOrder } = usePurchaseOrder();

    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [customProductName, setCustomProductName] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("1");
    const [estimatedCost, setEstimatedCost] = useState<string>("");
    const [supplierName, setSupplierName] = useState<string>("");
    const [supplierEmail, setSupplierEmail] = useState<string>("");
    const [supplierPhone, setSupplierPhone] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    useEffect(() => {
        const fetchInventory = async () => {
            if (!user) return;
            setLoadingInventory(true);
            try {
                const { data, error } = await supabase
                    .from("user_products")
                    .select("id, product_name, current_stock, selling_price")
                    .order("product_name");

                if (error) throw error;
                setInventoryItems(data ?? []);
            } catch (error) {
                console.error("Error loading inventory:", error);
                toast({
                    title: "Inventory Unavailable",
                    description: "Could not load inventory items. You can still enter a custom product.",
                    variant: "destructive",
                });
            } finally {
                setLoadingInventory(false);
            }
        };

        fetchInventory();
    }, [toast, user]);

    const handleProductSelect = (value: string) => {
        setSelectedProductId(value);
        if (value !== "custom") {
            setCustomProductName("");
            const item = inventoryItems.find((product) => product.id === value);
            if (item && item.selling_price) {
                setEstimatedCost(item.selling_price.toString());
            }
        }
    };

    const parsedQuantity = useMemo(() => {
        const parsed = parseInt(quantity, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }, [quantity]);

    const productName = useMemo(() => {
        if (selectedProductId === "custom") {
            return customProductName.trim();
        }
        const product = inventoryItems.find((item) => item.id === selectedProductId);
        return product?.product_name ?? "";
    }, [customProductName, inventoryItems, selectedProductId]);

    const estimatedUnitCost = useMemo(() => {
        const parsed = parseFloat(estimatedCost);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }, [estimatedCost]);

    const estimatedTotalCost = useMemo(() => {
        if (!estimatedUnitCost || parsedQuantity === 0) return undefined;
        return estimatedUnitCost * parsedQuantity;
    }, [estimatedUnitCost, parsedQuantity]);

    const isFormValid = () => {
        if (!supplierName.trim()) return false;
        if (!productName) return false;
        if (parsedQuantity <= 0) return false;
        return true;
    };

    const handleSave = async (status: "draft" | "issued") => {
        if (!isFormValid()) {
            toast({
                title: "Missing Information",
                description: "Please complete supplier, product, and quantity details.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const result = await generatePurchaseOrder(
                {
                    productName,
                    quantity: parsedQuantity,
                    supplierName: supplierName.trim(),
                    supplierEmail: supplierEmail.trim() || undefined,
                    supplierPhone: supplierPhone.trim() || undefined,
                    estimatedCost: estimatedUnitCost,
                    notes: notes.trim() || undefined,
                },
                { download: status === "issued" }
            );

            if (!result) {
                return;
            }

            const { poNumber, html } = result;
            const totalAmount = estimatedTotalCost ?? 0;

            await supabase.from("documents").insert({
                document_type: "purchase_order",
                document_number: poNumber,
                title: `Purchase Order - ${productName}`,
                content: {
                    poNumber,
                    supplier: {
                        name: supplierName.trim(),
                        email: supplierEmail.trim() || null,
                        phone: supplierPhone.trim() || null,
                    },
                    product: {
                        name: productName,
                        quantity: parsedQuantity,
                        estimatedUnitCost: estimatedUnitCost ?? null,
                        estimatedTotalCost: estimatedTotalCost ?? null,
                    },
                    notes: notes.trim() || null,
                    generatedAt: new Date().toISOString(),
                    html,
                },
                status,
                total_amount: totalAmount,
                customer_name: supplierName.trim(),
                user_id: user?.id,
            });

            if (status === "draft") {
                toast({
                    title: "Purchase Order Saved",
                    description: "Draft purchase order saved to your documents.",
                });
            }

            onSuccess();
        } catch (error) {
            console.error("Error creating purchase order:", error);
            toast({
                title: "Error",
                description: "Failed to create purchase order. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold">Create Purchase Order</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Supplier & Order Details</CardTitle>
                    <CardDescription>
                        Generate a purchase order using the same template as the inventory order workflow.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Supplier Name *</Label>
                                <Input
                                    placeholder="Supplier or vendor name"
                                    value={supplierName}
                                    onChange={(event) => setSupplierName(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Supplier Phone</Label>
                                <Input
                                    placeholder="Phone number"
                                    value={supplierPhone}
                                    onChange={(event) => setSupplierPhone(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Supplier Email</Label>
                                <Input
                                    type="email"
                                    placeholder="supplier@example.com"
                                    value={supplierEmail}
                                    onChange={(event) => setSupplierEmail(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Product *</Label>
                                <Select
                                    value={selectedProductId}
                                    onValueChange={handleProductSelect}
                                    disabled={loadingInventory}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingInventory ? "Loading inventory..." : "Select product"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventoryItems.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.product_name} (Current: {item.current_stock})
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="custom">Custom product</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedProductId === "custom" && (
                                    <Input
                                        className="mt-2"
                                        placeholder="Describe the product"
                                        value={customProductName}
                                        onChange={(event) => setCustomProductName(event.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Quantity *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Estimated Unit Cost (¢)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={estimatedCost}
                                    onChange={(event) => setEstimatedCost(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Total Estimate (¢)</Label>
                                <div className="h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm flex items-center">
                                    {estimatedTotalCost ? `¢${estimatedTotalCost.toFixed(2)}` : "Auto-calculated"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label>Additional Notes</Label>
                        <Textarea
                            placeholder="Special requirements, preferred brands, delivery timeline, etc."
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-foreground">Issued documents will download automatically.</p>
                                <p className="text-muted-foreground">
                                    Saving as draft stores the order in Documents without downloading. Issuing now will download the
                                    official purchase order and archive it in your Documents workspace.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => handleSave("draft")}
                            disabled={saving || !isFormValid()}
                        >
                            Save as Draft
                        </Button>
                        <Button
                            onClick={() => handleSave("issued")}
                            disabled={saving || !isFormValid()}
                        >
                            Create & Issue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PurchaseOrderCreator;
