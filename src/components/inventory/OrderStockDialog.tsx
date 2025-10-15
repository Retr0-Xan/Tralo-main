import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Mail, FileText, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseOrder } from "@/hooks/usePurchaseOrder";
import { shareViaWhatsApp } from "@/lib/whatsapp";

interface InventoryItem {
  id: string;
  product_name: string;
  current_stock: number;
}

interface OrderStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryData: InventoryItem[];
}

const OrderStockDialog = ({
  open,
  onOpenChange,
  inventoryData
}: OrderStockDialogProps) => {
  const { toast } = useToast();
  const { generatePurchaseOrder, generateOrderMessage } = usePurchaseOrder();

  const [orderProduct, setOrderProduct] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const handleGenerateDocument = async () => {
    if (!orderProduct || !orderQuantity || !supplierName) {
      toast({
        title: "Missing Information",
        description: "Please fill in product, quantity, and supplier name.",
        variant: "destructive",
      });
      return;
    }

    const purchaseOrder = await generatePurchaseOrder({
      productName: orderProduct,
      quantity: parseInt(orderQuantity),
      supplierName,
      supplierEmail: supplierEmail || undefined,
      supplierPhone: supplierPhone || undefined,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      notes: orderNotes || undefined
    });

    if (purchaseOrder?.poNumber) {
      resetForm();
    }
  };

  const handleShare = async (method: 'whatsapp' | 'sms' | 'email') => {
    if (!orderProduct || !orderQuantity || !supplierName) {
      toast({
        title: "Missing Information",
        description: "Please fill in product, quantity, and supplier name.",
        variant: "destructive",
      });
      return;
    }

    const message = generateOrderMessage({
      productName: orderProduct,
      quantity: parseInt(orderQuantity),
      supplierName
    });

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        const success = await shareViaWhatsApp({
          message,
          maxLength: 800,
          delay: 100
        });

        if (!success) {
          toast({
            title: "WhatsApp Share",
            description: "If WhatsApp didn't open, the message has been copied to your clipboard.",
          });
        }
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        const subject = encodeURIComponent(`Stock Order Request - ${orderProduct}`);
        window.open(`mailto:${supplierEmail || ''}?subject=${subject}&body=${encodedMessage}`, '_blank');
        break;
    }

    toast({
      title: "Sharing Options Opened",
      description: `${method.charAt(0).toUpperCase() + method.slice(1)} sharing options have been opened.`,
    });
  };

  const resetForm = () => {
    setOrderProduct("");
    setOrderQuantity("");
    setSupplierName("");
    setSupplierEmail("");
    setSupplierPhone("");
    setEstimatedCost("");
    setOrderNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Order Stock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Product</Label>
            <Select value={orderProduct} onValueChange={setOrderProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Choose product to reorder" />
              </SelectTrigger>
              <SelectContent>
                {inventoryData.map((item) => (
                  <SelectItem key={item.id} value={item.product_name}>
                    {item.product_name} (Current: {item.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity Needed</Label>
              <Input
                type="number"
                placeholder="How many units?"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Estimated Cost per Unit (¢)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Supplier Name *</Label>
            <Input
              placeholder="Supplier or vendor name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Supplier Email</Label>
              <Input
                type="email"
                placeholder="supplier@example.com"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Supplier Phone</Label>
              <Input
                type="tel"
                placeholder="Phone number"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Special requirements, preferred brands, delivery timeline, etc."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Share Options */}
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm font-medium mb-3 block">Share Order Request</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('whatsapp')}
                  className="flex flex-col gap-1 h-auto py-3"
                  disabled={!orderProduct || !orderQuantity || !supplierName}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('sms')}
                  className="flex flex-col gap-1 h-auto py-3"
                  disabled={!orderProduct || !orderQuantity || !supplierName}
                >
                  <Send className="w-4 h-4" />
                  <span className="text-xs">SMS</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('email')}
                  className="flex flex-col gap-1 h-auto py-3"
                  disabled={!orderProduct || !orderQuantity || !supplierName}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-xs">Email</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generate Document */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateDocument}
              className="flex-1"
              disabled={!orderProduct || !orderQuantity || !supplierName}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Purchase Order
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderStockDialog;