import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const usePurchaseOrder = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const generatePurchaseOrder = async (orderData: {
    productName: string;
    quantity: number;
    supplierName: string;
    supplierEmail?: string;
    supplierPhone?: string;
    estimatedCost?: number;
    notes?: string;
  }) => {
    if (!user) return null;

    try {
      // Get business profile
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) {
        toast({
          title: "Error",
          description: "Business profile not found. Please complete your profile first.",
          variant: "destructive",
        });
        return null;
      }

      // Generate purchase order number
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      const orderDate = new Date().toISOString().split('T')[0];
      
      // Generate HTML purchase order
      const purchaseOrderHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Purchase Order - ${poNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { flex: 1; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333; }
            .po-info { text-align: right; }
            .po-number { font-size: 18px; font-weight: bold; color: #007bff; }
            .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .details-box { padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f0f8ff; }
            .terms { margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }
            .footer { margin-top: 40px; text-align: center; padding: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
            .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 40px 0; }
            .signature-box { text-align: center; }
            .signature-line { border-bottom: 1px solid #333; width: 200px; margin: 30px auto 10px auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div class="company-name">${businessProfile.business_name}</div>
              <div>${businessProfile.business_address || 'Business Address'}</div>
              <div>Phone: ${businessProfile.phone_number || 'N/A'}</div>
              <div>Email: ${businessProfile.email || 'N/A'}</div>
            </div>
            <div class="po-info">
              <div class="po-number">Purchase Order #${poNumber}</div>
              <div>Date: ${new Date(orderDate).toLocaleDateString()}</div>
              <div>Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="section-title">Supplier Information</div>
          <div class="details-box">
            <div><strong>Supplier:</strong> ${orderData.supplierName}</div>
            ${orderData.supplierEmail ? `<div><strong>Email:</strong> ${orderData.supplierEmail}</div>` : ''}
            ${orderData.supplierPhone ? `<div><strong>Phone:</strong> ${orderData.supplierPhone}</div>` : ''}
          </div>

          <div class="section-title">Order Details</div>
          <table class="table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Quantity</th>
                <th>Estimated Unit Cost</th>
                <th>Estimated Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${orderData.productName}</td>
                <td>${orderData.quantity}</td>
                <td>${orderData.estimatedCost ? `¢${orderData.estimatedCost.toFixed(2)}` : 'TBD'}</td>
                <td class="total-row">${orderData.estimatedCost ? `¢${(orderData.estimatedCost * orderData.quantity).toFixed(2)}` : 'TBD'}</td>
              </tr>
            </tbody>
          </table>

          ${orderData.notes ? `
            <div class="section-title">Special Instructions</div>
            <div class="details-box">
              ${orderData.notes}
            </div>
          ` : ''}

          <div class="terms">
            <div class="section-title">Terms and Conditions</div>
            <ul>
              <li>Payment terms: Net 30 days from delivery</li>
              <li>Delivery timeframe: As agreed upon confirmation</li>
              <li>All items must meet quality specifications</li>
              <li>Supplier to provide delivery confirmation</li>
              <li>This purchase order is valid for 30 days from issue date</li>
            </ul>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Authorized By</strong></div>
              <div>${businessProfile.owner_name || 'Business Owner'}</div>
              <div>Date: _______________</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Supplier Acknowledgment</strong></div>
              <div>${orderData.supplierName}</div>
              <div>Date: _______________</div>
            </div>
          </div>

          <div class="footer">
            <div><strong>Powered by Tralo</strong> - Business Management System</div>
            <div>Visit https://tralo.com for comprehensive business management solutions</div>
            <div>Generated on ${new Date().toLocaleString()}</div>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([purchaseOrderHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchase_order_${poNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "📋 Purchase Order Generated!",
        description: "Purchase order has been downloaded successfully.",
      });

      return poNumber;
    } catch (error) {
      console.error('Error generating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to generate purchase order. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const generateOrderMessage = (orderData: {
    productName: string;
    quantity: number;
    supplierName: string;
    poNumber?: string;
  }) => {
    const message = `Hello ${orderData.supplierName},

I hope this message finds you well. I would like to place an order for the following:

Product: ${orderData.productName}
Quantity: ${orderData.quantity}
${orderData.poNumber ? `Purchase Order #: ${orderData.poNumber}` : ''}

Could you please confirm:
1. Availability of the requested quantity
2. Unit price and total cost
3. Expected delivery timeframe
4. Payment terms

Please let me know if you need any additional information.

Thank you for your time and I look forward to hearing from you soon.

Best regards,
${user?.email || 'Business Owner'}

---
This message was generated by Tralo Business Management System
Visit https://tralo.com for more business solutions`;

    return message;
  };

  return {
    generatePurchaseOrder,
    generateOrderMessage
  };
};