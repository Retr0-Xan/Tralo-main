import { useState, useEffect } from "react";
import { ArrowLeft, Save, Download, User, Package, DollarSign, Share2, MessageSquare, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import PurchaseOrderCreator from "./PurchaseOrderCreator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentShare } from "@/hooks/useDocumentShare";

interface DocumentCreatorProps {
  documentType: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Discount amount per item
  total: number;
  isFromStock: boolean;
  productId?: string;
}

interface StockItem {
  id: string;
  product_name: string;
  current_stock: number;
  unit_price?: number;
}

const DocumentCreator = ({ documentType, onBack, onSuccess }: DocumentCreatorProps) => {
  if (documentType === "purchase_order") {
    return (
      <PurchaseOrderCreator
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );
  }

  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    customerName: "",
    customerAddress: "",
    customerPhone: "",
    documentNumber: `${documentType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: "",
    notes: "",
    paymentTerms: "Cash",
    currency: "GHS", // Ghana Cedis
    includeVAT: false, // VAT is optional for informal traders
    overallDiscount: 0 // Overall document discount
  });

  const [items, setItems] = useState<DocumentItem[]>([
    { description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0, isFromStock: false }
  ]);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .order('product_name');

      if (error) throw error;

      // Mock data with prices for demo if no real data
      const mockStock: StockItem[] = [
        { id: '1', product_name: 'Rice (50kg bag)', current_stock: 25, unit_price: 180.00 },
        { id: '2', product_name: 'Fish (Tilapia)', current_stock: 0, unit_price: 15.00 },
        { id: '3', product_name: 'Tomatoes (basket)', current_stock: 12, unit_price: 45.00 },
        { id: '4', product_name: 'Onions (bag)', current_stock: 8, unit_price: 35.00 },
        { id: '5', product_name: 'Cooking Oil (5L)', current_stock: 15, unit_price: 55.00 },
      ];

      setStockItems(data?.length ? data : mockStock);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      setStockItems([]);
    }
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case "receipt":
        return "Receipt";
      case "invoice":
        return "Invoice";
      case "waybill":
        return "Waybill";
      case "purchase_order":
        return "Purchase Order";
      default:
        return "Document";
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, discount: 0, total: 0, isFromStock: false }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: string | number | boolean) => {
    const updatedItems = items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };

        // If selecting a product from stock, auto-populate price
        if (field === 'description' && typeof value === 'string') {
          const stockItem = stockItems.find(stock => stock.product_name === value);
          if (stockItem) {
            updatedItem.isFromStock = true;
            updatedItem.productId = stockItem.id;
            updatedItem.unitPrice = stockItem.unit_price || 0;
          } else {
            updatedItem.isFromStock = false;
            updatedItem.productId = undefined;
          }
        }

        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          const subtotal = updatedItem.quantity * updatedItem.unitPrice;
          const discountAmount = updatedItem.discount * updatedItem.quantity;
          updatedItem.total = subtotal - discountAmount;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateOverallDiscount = () => {
    return formData.overallDiscount;
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateSubtotal() - calculateOverallDiscount();
  };

  const calculateTax = () => {
    if (!formData.includeVAT) return 0;
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    return subtotalAfterDiscount * 0.125; // 12.5% VAT for Ghana (optional)
  };

  const calculateTotal = () => {
    return calculateSubtotalAfterDiscount() + calculateTax();
  };

  const saveDocument = async (status: 'draft' | 'issued') => {
    setLoading(true);
    try {
      const documentContent = {
        ...formData,
        items,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal()
      } as any;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          document_type: documentType,
          document_number: formData.documentNumber,
          title: `${getDocumentTitle()} - ${formData.customerName}`,
          content: documentContent,
          status,
          total_amount: calculateTotal(),
          customer_name: formData.customerName,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: status === 'draft' ? "Document Saved" : "Document Created",
        description: `${getDocumentTitle()} has been ${status === 'draft' ? 'saved as draft' : 'created and issued'} successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create {getDocumentTitle()}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
          <CardDescription>
            Fill in the details for your {getDocumentTitle().toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Package className="w-5 h-5" />
                Items
              </h3>
              <Button onClick={addItem} variant="outline" size="sm">
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Label className="text-xs">Description</Label>
                      <div className="relative">
                        <Input
                          list={`stock-items-${index}`}
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Type custom item or select from stock"
                          className={item.isFromStock ? "border-green-300 bg-green-50" : ""}
                        />
                        <datalist id={`stock-items-${index}`}>
                          {stockItems.map((stockItem) => (
                            <option key={stockItem.id} value={stockItem.product_name}>
                              {stockItem.current_stock > 0 ? `In Stock (${stockItem.current_stock})` : 'Out of Stock'}
                            </option>
                          ))}
                        </datalist>
                        {item.isFromStock && (
                          <div className="absolute -bottom-5 left-0">
                            <span className="text-xs text-green-600">
                              ✓ From stock
                              {stockItems.find(s => s.product_name === item.description)?.current_stock === 0 &&
                                " (Out of stock)"
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className={item.isFromStock ? "bg-yellow-50 border-yellow-300" : ""}
                        placeholder="Enter price"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Discount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <div className="text-xs text-muted-foreground">
                        {!item.isFromStock && item.description && (
                          <span className="text-blue-600">✓ Custom item</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6">
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          Total: ¢{item.total.toFixed(2)}
                        </span>
                        {item.discount > 0 && (
                          <div className="text-xs text-green-600">
                            (Saved ¢{(item.discount * item.quantity).toFixed(2)})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals and VAT */}
          <div className="border-t pt-4 space-y-4">
            {/* Overall Discount */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="overallDiscount" className="text-sm">
                    Overall Discount (¢)
                  </Label>
                  <Input
                    id="overallDiscount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.overallDiscount}
                    onChange={(e) => setFormData({ ...formData, overallDiscount: parseFloat(e.target.value) || 0 })}
                    className="w-24 h-8"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="includeVAT" className="text-base font-medium">
                  Include VAT (12.5%)
                </Label>
                <p className="text-sm text-muted-foreground">
                  If applicable to your business
                </p>
              </div>
              <Switch
                id="includeVAT"
                checked={formData.includeVAT}
                onCheckedChange={(checked) => setFormData({ ...formData, includeVAT: checked })}
              />
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>¢{calculateSubtotal().toFixed(2)}</span>
                </div>
                {formData.overallDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Overall Discount:</span>
                    <span>-¢{calculateOverallDiscount().toFixed(2)}</span>
                  </div>
                )}
                {formData.includeVAT && (
                  <div className="flex justify-between">
                    <span>VAT (12.5%):</span>
                    <span>¢{calculateTax().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>¢{calculateTotal().toFixed(2)}</span>
                </div>
                {(items.some(item => item.discount > 0) || formData.overallDiscount > 0) && (
                  <div className="text-xs text-green-600 text-right">
                    Total Savings: ¢{(
                      items.reduce((sum, item) => sum + (item.discount * item.quantity), 0) +
                      formData.overallDiscount
                    ).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Net 7">Net 7 days</SelectItem>
                  <SelectItem value="Net 15">Net 15 days</SelectItem>
                  <SelectItem value="Net 30">Net 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {documentType === "invoice" && (
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or terms..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => saveDocument('draft')}
              variant="outline"
              disabled={loading || !formData.customerName}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => saveDocument('issued')}
              disabled={loading || !formData.customerName}
            >
              <Download className="w-4 h-4 mr-2" />
              Create & Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentCreator;