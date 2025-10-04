import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ProductRequestForm = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    reason: "",
    priority: "medium"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.productName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the product name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Save to database
      const { error: dbError } = await supabase
        .from('product_requests')
        .insert({
          user_id: user.id,
          product_name: formData.productName.trim(),
          description: formData.description.trim() || null,
          reason: formData.reason.trim() || null,
          priority: formData.priority
        });

      if (dbError) throw dbError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-product-request-email', {
        body: {
          productName: formData.productName,
          description: formData.description,
          reason: formData.reason,
          priority: formData.priority,
          userEmail: user.email,
          userId: user.id
        }
      });

      if (emailError) {
        console.warn('Email sending failed:', emailError);
        // Don't throw error - still show success since it's saved to DB
      }

      toast({
        title: "Request Submitted",
        description: `Your request for "${formData.productName}" has been submitted for review.`,
      });

      // Reset form
      setFormData({
        productName: "",
        description: "",
        reason: "",
        priority: "medium"
      });

    } catch (error) {
      console.error('Error submitting product request:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Request New Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              placeholder="e.g., Rice, Maize, Cocoa, etc."
            />
          </div>

          <div>
            <Label htmlFor="description">Product Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the product specifications, quality, variety, etc."
            />
          </div>

          <div>
            <Label htmlFor="reason">Why do you need this product?</Label>
            <Textarea
              id="reason"
              rows={3}
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Explain why you need this product on the trade index..."
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    High Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </form>

        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">💡 Tip:</p>
              <p>Your request will be reviewed by our team. High-demand products are prioritized for addition to the trade index.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductRequestForm;