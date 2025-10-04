import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { Receipt, DollarSign, Calendar, User, FileText, CreditCard } from "lucide-react";

const expenseSchema = z.object({
  vendor_name: z.string().trim().min(1, "Vendor name is required").max(100, "Vendor name too long"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0, 
    "Amount must be a valid positive number"
  ),
  expense_date: z.string().min(1, "Date is required"),
  description: z.string().max(500, "Description too long").optional(),
  payment_method: z.string().optional(),
  notes: z.string().max(1000, "Notes too long").optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseRecordingProps {
  onExpenseRecorded?: () => void;
}

const ExpenseRecording = ({ onExpenseRecorded }: ExpenseRecordingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    vendor_name: "",
    category: "",
    amount: "",
    expense_date: new Date().toISOString().split('T')[0],
    description: "",
    payment_method: "cash",
    notes: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  const categories = [
    "Office Supplies",
    "Transport & Fuel", 
    "Marketing & Advertising",
    "Rent & Utilities",
    "Equipment & Tools",
    "Professional Services",
    "Food & Beverages",
    "Insurance",
    "Maintenance & Repairs",
    "Inventory Purchase",
    "Other"
  ];

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "mobile_money", label: "Mobile Money" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "card", label: "Card Payment" },
    { value: "credit", label: "Credit/Later" }
  ];

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      expenseSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            const field = err.path[0] as keyof ExpenseFormData;
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const generateExpenseNumber = async (): Promise<string> => {
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .rpc('generate_expense_number', { user_uuid: user.id });
    
    if (error) {
      console.error('Error generating expense number:', error);
      // Fallback to timestamp-based number
      return `EXP-${Date.now().toString().slice(-6)}`;
    }
    
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to record expenses.",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error", 
        description: "Please check all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseNumber = await generateExpenseNumber();
      
      const expenseData = {
        user_id: user.id,
        expense_number: expenseNumber,
        vendor_name: formData.vendor_name.trim(),
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        description: formData.description?.trim() || null,
        payment_method: formData.payment_method || "cash",
        notes: formData.notes?.trim() || null,
        currency: "¢",
        status: "recorded"
      };

      const { error } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Expense Recorded Successfully!",
        description: `${formData.vendor_name} - ¢${formData.amount} has been added to your records.`,
      });

      // Reset form
      setFormData({
        vendor_name: "",
        category: "",
        amount: "",
        expense_date: new Date().toISOString().split('T')[0],
        description: "",
        payment_method: "cash",
        notes: ""
      });

      // Notify parent component
      onExpenseRecorded?.();

    } catch (error) {
      console.error('Error recording expense:', error);
      toast({
        title: "Error Recording Expense",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Record New Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="vendor_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Vendor/Supplier Name *
              </Label>
              <Input
                id="vendor_name"
                type="text"
                placeholder="e.g., ABC Supply Co."
                value={formData.vendor_name}
                onChange={(e) => handleInputChange("vendor_name", e.target.value)}
                className={errors.vendor_name ? "border-red-500" : ""}
                maxLength={100}
              />
              {errors.vendor_name && (
                <p className="text-sm text-red-600">{errors.vendor_name}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amount (¢) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="expense_date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date *
              </Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleInputChange("expense_date", e.target.value)}
                className={errors.expense_date ? "border-red-500" : ""}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.expense_date && (
                <p className="text-sm text-red-600">{errors.expense_date}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => handleInputChange("payment_method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the expense..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this expense..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="min-h-[60px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.notes?.length || 0}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Record Expense
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseRecording;