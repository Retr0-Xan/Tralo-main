import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Receipt, Edit2, Trash2, Search, Filter, Eye, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TrustScoreBadge from "@/components/TrustScoreBadge";

interface ExternalReceipt {
  id: string;
  receipt_number: string;
  vendor_name: string;
  amount: number;
  currency: string;
  receipt_date: string;
  category: string;
  description?: string;
  payment_method?: string;
  receipt_image_url?: string;
  notes?: string;
  created_at: string;
  converted_to_expense?: boolean;
}

interface ExternalReceiptsManagerProps {
  onBack: () => void;
}

const ExternalReceiptsManager = ({ onBack }: ExternalReceiptsManagerProps) => {
  const [receipts, setReceipts] = useState<ExternalReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ExternalReceipt | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    receipt_number: "",
    vendor_name: "",
    amount: "",
    receipt_date: "",
    category: "",
    description: "",
    payment_method: "",
    notes: ""
  });

  const categories = [
    "Office Supplies",
    "Equipment",
    "Marketing",
    "Transportation", 
    "Utilities",
    "Professional Services",
    "Inventory/Stock",
    "Maintenance",
    "Insurance",
    "Other"
  ];

  const paymentMethods = [
    "Cash",
    "Bank Transfer",
    "Mobile Money",
    "Card Payment",
    "Cheque",
    "Credit"
  ];

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('external_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      receipt_number: "",
      vendor_name: "",
      amount: "",
      receipt_date: "",
      category: "",
      description: "",
      payment_method: "",
      notes: ""
    });
    setEditingReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.receipt_number || !formData.vendor_name || !formData.amount || !formData.receipt_date || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const receiptData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user?.id
      };

      if (editingReceipt) {
        const { error } = await supabase
          .from('external_receipts')
          .update(receiptData)
          .eq('id', editingReceipt.id);

        if (error) throw error;

        toast({
          title: "Receipt Updated",
          description: "External receipt has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('external_receipts')
          .insert(receiptData);

        if (error) throw error;

        toast({
          title: "Receipt Added",
          description: "External receipt has been recorded successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({
        title: "Error",
        description: "Failed to save receipt",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (receipt: ExternalReceipt) => {
    setFormData({
      receipt_number: receipt.receipt_number,
      vendor_name: receipt.vendor_name,
      amount: receipt.amount.toString(),
      receipt_date: receipt.receipt_date,
      category: receipt.category,
      description: receipt.description || "",
      payment_method: receipt.payment_method || "",
      notes: receipt.notes || ""
    });
    setEditingReceipt(receipt);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('external_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Receipt Deleted",
        description: "External receipt has been removed",
      });
      
      fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({
        title: "Error", 
        description: "Failed to delete receipt",
        variant: "destructive",
      });
    }
  };

  const handleAddAsExpense = async (receipt: ExternalReceipt) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Generate expense number
      const { data: expenseNumber, error: numberError } = await supabase
        .rpc('generate_expense_number', { user_uuid: user.id });

      if (numberError) throw numberError;

      // Create expense record
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          expense_number: expenseNumber,
          vendor_name: receipt.vendor_name,
          amount: receipt.amount,
          expense_date: receipt.receipt_date,
          category: receipt.category,
          description: receipt.description,
          payment_method: receipt.payment_method,
          receipt_image_url: receipt.receipt_image_url,
          notes: receipt.notes,
          currency: receipt.currency,
          external_receipt_id: receipt.id,
          status: 'recorded'
        });

      if (expenseError) throw expenseError;

      // Mark receipt as converted
      const { error: updateError } = await supabase
        .from('external_receipts')
        .update({ converted_to_expense: true })
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      // Refresh receipts to show updated status
      fetchReceipts();

      toast({
        title: "Success",
        description: `Receipt converted to expense ${expenseNumber}`,
      });
    } catch (error) {
      console.error('Error converting to expense:', error);
      toast({
        title: "Error",
        description: "Failed to convert receipt to expense",
        variant: "destructive",
      });
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (receipt.description && receipt.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || receipt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);

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
        <h2 className="text-2xl font-bold text-foreground">External Receipts Manager</h2>
        <p className="text-muted-foreground">
          Track and manage receipts from external purchases and business expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">¢{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {receipts.filter(r => new Date(r.receipt_date).getMonth() === new Date().getMonth()).length}
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
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReceipt ? "Edit External Receipt" : "Add External Receipt"}
              </DialogTitle>
              <DialogDescription>
                Record details of an external purchase or business expense
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receipt_number">Receipt Number *</Label>
                  <Input
                    id="receipt_number"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
                    placeholder="e.g., RCT-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor/Supplier Name *</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    placeholder="e.g., ABC Supplies"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (¢) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_date">Receipt Date *</Label>
                  <Input
                    id="receipt_date"
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(value) => setFormData({...formData, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the purchase..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingReceipt ? "Update Receipt" : "Add Receipt"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>External Receipts ({filteredReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading receipts...</div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No external receipts found</p>
              <p className="text-sm">Add your first receipt to start tracking expenses</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                    <TableCell>{receipt.vendor_name}</TableCell>
                    <TableCell>¢{receipt.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(receipt.receipt_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{receipt.category}</Badge>
                    </TableCell>
                    <TableCell>{receipt.payment_method || "-"}</TableCell>
                    <TableCell>
                      {receipt.converted_to_expense ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-100">
                          Converted to Expense
                        </Badge>
                      ) : (
                        <Badge variant="outline">Receipt Only</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(receipt)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!receipt.converted_to_expense && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddAsExpense(receipt)}
                            className="text-green-600 hover:text-green-700"
                            title="Convert to Expense"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receipt.id)}
                          className="text-destructive hover:text-destructive"
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

export default ExternalReceiptsManager;