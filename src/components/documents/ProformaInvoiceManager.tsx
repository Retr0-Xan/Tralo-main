import { useState, useEffect } from "react";
import { ArrowLeft, Plus, FileText, Edit2, Trash2, Search, Filter, Eye, Calendar, DollarSign, Send, Download, Share2, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import { useDocumentShare } from "@/hooks/useDocumentShare";

interface ProformaInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  terms_and_conditions?: string;
  notes?: string;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProformaInvoiceManagerProps {
  onBack: () => void;
}

const ProformaInvoiceManager = ({ onBack }: ProformaInvoiceManagerProps) => {
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ProformaInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const { shareViaWhatsApp, shareViaEmail, shareViaSMS } = useDocumentShare();

  // Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    invoice_date: "",
    due_date: "",
    tax_rate: "0",
    discount_rate: "0",
    terms_and_conditions: "",
    notes: ""
  });

  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { item_name: "", description: "", quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  const statuses = ["draft", "sent", "accepted", "expired"];

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    // Auto-set invoice date to today when creating new invoice
    if (!editingInvoice && !formData.invoice_date) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, invoice_date: today }));
    }
  }, [editingInvoice, formData.invoice_date]);

  const fetchInvoices = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('proforma_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load proforma invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadProformaInvoice = async (invoice: ProformaInvoice) => {
    try {
      if (!user) return;

      // Fetch business profile
      const { data: businessProfile, error: profileError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching business profile:', profileError);
        toast({
          title: "Error",
          description: "Please complete your business profile first",
          variant: "destructive",
        });
        return;
      }

      // Fetch invoice items
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        toast({
          title: "Error",
          description: "Failed to load invoice items",
          variant: "destructive",
        });
        return;
      }

      // Map invoice items to edge function format
      const items = (invoiceItems || []).map(item => ({
        name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.total_price
      }));

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-proforma-invoice', {
        body: {
          businessProfile,
          document: {
            documentNumber: invoice.invoice_number,
            date: invoice.invoice_date,
            validUntil: invoice.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            customer: {
              name: invoice.customer_name,
              email: invoice.customer_email || '',
              phone: invoice.customer_phone || '',
              address: invoice.customer_address || ''
            },
            items,
            subtotal: invoice.subtotal,
            tax: invoice.tax_amount,
            total: invoice.total_amount,
            notes: invoice.notes || '',
            termsAndConditions: invoice.terms_and_conditions || 'Payment terms apply as per agreement.'
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Error",
          description: "Failed to generate proforma invoice",
          variant: "destructive",
        });
        return;
      }

      if (!data || !data.html) {
        console.error('No HTML returned from edge function');
        toast({
          title: "Error",
          description: "Failed to generate proforma invoice",
          variant: "destructive",
        });
        return;
      }

      // Create blob and download
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proforma_Invoice_${invoice.invoice_number}.html`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Success",
        description: "Proforma invoice downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading proforma invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download proforma invoice",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: "",
      tax_rate: "0",
      discount_rate: "0",
      terms_and_conditions: "",
      notes: ""
    });
    setItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
    setEditingInvoice(null);
  };

  const addItem = () => {
    setItems([...items, { item_name: "", description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total price when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const taxRate = parseFloat(formData.tax_rate) || 0;
    const discountRate = parseFloat(formData.discount_rate) || 0;

    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = (subtotal * discountRate) / 100;
    const total = subtotal + taxAmount - discountAmount;

    return { subtotal, taxAmount, discountAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== Proforma Invoice Submit ===');
    console.log('User ID:', user?.id);
    console.log('Form Data:', formData);
    console.log('Items:', items);

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create invoices",
        variant: "destructive",
      });
      return;
    }

    if (!formData.customer_name || !formData.invoice_date) {
      toast({
        title: "Error",
        description: "Please fill in customer name and invoice date",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => !item.item_name || item.quantity <= 0)) {
      toast({
        title: "Error",
        description: "All items must have a name and quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { subtotal, taxAmount, discountAmount, total } = calculateTotals();

      console.log('Calculated totals:', { subtotal, taxAmount, discountAmount, total });

      let invoiceNumber = editingInvoice?.invoice_number;
      if (!invoiceNumber) {
        // Generate new invoice number
        console.log('Generating invoice number...');
        const { data: numberData, error: numberError } = await supabase.rpc('generate_proforma_invoice_number', {
          user_uuid: user.id
        });

        if (numberError) {
          console.error('Error generating invoice number:', numberError);
          throw numberError;
        }
        invoiceNumber = numberData;
        console.log('Generated invoice number:', invoiceNumber);
      }

      const invoiceData = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        customer_address: formData.customer_address || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        subtotal,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        tax_amount: taxAmount,
        discount_rate: parseFloat(formData.discount_rate) || 0,
        discount_amount: discountAmount,
        total_amount: total,
        currency: '¢',
        status: 'draft',
        terms_and_conditions: formData.terms_and_conditions || null,
        notes: formData.notes || null
      };

      console.log('Invoice data to save:', invoiceData);

      let invoiceId: string;

      if (editingInvoice) {
        console.log('Updating existing invoice:', editingInvoice.id);
        const { error } = await supabase
          .from('proforma_invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) {
          console.error('Error updating invoice:', error);
          throw error;
        }
        invoiceId = editingInvoice.id;

        // Delete existing items and insert new ones
        console.log('Deleting old items...');
        await supabase
          .from('proforma_invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);
      } else {
        console.log('Creating new invoice...');
        const { data: invoiceResult, error } = await supabase
          .from('proforma_invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (error) {
          console.error('Error creating invoice:', error);
          throw error;
        }

        if (!invoiceResult) {
          throw new Error('No invoice result returned');
        }

        invoiceId = invoiceResult.id;
        console.log('Created invoice with ID:', invoiceId);
      }

      // Insert items
      const itemsData = items.map(item => ({
        invoice_id: invoiceId,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      console.log('Inserting items:', itemsData);

      const { error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .insert(itemsData);

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        throw itemsError;
      }

      console.log('Invoice saved successfully!');

      toast({
        title: editingInvoice ? "Invoice Updated" : "Invoice Created",
        description: `Proforma invoice ${invoiceNumber} has been ${editingInvoice ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save proforma invoice. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (invoice: ProformaInvoice) => {
    try {
      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) throw itemsError;

      setFormData({
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email || "",
        customer_phone: invoice.customer_phone || "",
        customer_address: invoice.customer_address || "",
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || "",
        tax_rate: invoice.tax_rate.toString(),
        discount_rate: invoice.discount_rate.toString(),
        terms_and_conditions: invoice.terms_and_conditions || "",
        notes: invoice.notes || ""
      });

      setItems(itemsData?.map(item => ({
        item_name: item.item_name,
        description: item.description || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || []);

      setEditingInvoice(invoice);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error loading invoice for editing:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('proforma_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Invoice Deleted",
        description: "Proforma invoice has been removed",
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('proforma_invoices')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Invoice status changed to ${newStatus}`,
      });

      fetchInvoices();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "default",
      accepted: "default",
      expired: "destructive"
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Button>
        </div>
        <TrustScoreBadge size="sm" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">Proforma Invoices</h2>
        <p className="text-muted-foreground">
          Create and manage professional proforma invoices for your customers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">¢{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sent/Active</p>
                <p className="text-2xl font-bold">
                  {invoices.filter(i => i.status === 'sent' || i.status === 'accepted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? "Edit Proforma Invoice" : "Create Proforma Invoice"}
              </DialogTitle>
              <DialogDescription>
                Fill in the details to create a professional proforma invoice
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="e.g., ABC Trading Company"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_address">Customer Address</Label>
                  <Textarea
                    id="customer_address"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    placeholder="Customer's business address..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Invoice Items</h3>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg">
                      <div className="col-span-3">
                        <Input
                          placeholder="Item name"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Unit Price"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 flex items-center">
                        <span className="text-sm font-medium">¢{item.total_price.toFixed(2)}</span>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals and Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Settings</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                      <Input
                        id="tax_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount_rate">Discount (%)</Label>
                      <Input
                        id="discount_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.discount_rate}
                        onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Valid Until</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Invoice Summary</h3>
                  <div className="space-y-2 p-4 border rounded-lg">
                    {(() => {
                      const { subtotal, taxAmount, discountAmount, total } = calculateTotals();
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>¢{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax ({formData.tax_rate}%):</span>
                            <span>¢{taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Discount ({formData.discount_rate}%):</span>
                            <span>-¢{discountAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>¢{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Terms and Notes */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terms_and_conditions">Terms and Conditions</Label>
                  <Textarea
                    id="terms_and_conditions"
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                    placeholder="Payment terms, delivery conditions, etc..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Proforma Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No proforma invoices found</p>
              <p className="text-sm">Create your first invoice to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>¢{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={invoice.status}
                        onValueChange={(value) => updateStatus(invoice.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          {getStatusBadge(invoice.status)}
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(status => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadProformaInvoice(invoice)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" title="Share">
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => shareViaWhatsApp({
                              documentNumber: invoice.invoice_number,
                              documentType: "Proforma Invoice",
                              customerName: invoice.customer_name,
                              totalAmount: invoice.total_amount
                            }, invoice.customer_phone)}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              WhatsApp
                            </DropdownMenuItem>
                            {invoice.customer_email && (
                              <DropdownMenuItem onClick={() => shareViaEmail({
                                documentNumber: invoice.invoice_number,
                                documentType: "Proforma Invoice",
                                customerName: invoice.customer_name,
                                totalAmount: invoice.total_amount
                              }, invoice.customer_email)}>
                                <Mail className="w-4 h-4 mr-2" />
                                Email
                              </DropdownMenuItem>
                            )}
                            {invoice.customer_phone && (
                              <DropdownMenuItem onClick={() => shareViaSMS({
                                documentNumber: invoice.invoice_number,
                                documentType: "Proforma Invoice",
                                customerName: invoice.customer_name,
                                totalAmount: invoice.total_amount
                              }, invoice.customer_phone)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                SMS
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default ProformaInvoiceManager;