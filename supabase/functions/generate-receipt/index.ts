import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  businessProfile: any;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    isFromInventory: boolean;
  }>;
  customer: {
    name: string;
    phone: string;
  };
  subtotal: number;
  totalTax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  partialPayment?: number;
  applyTaxes: boolean;
  notes?: string;
  date: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const saleData: ReceiptRequest = await req.json();

    // Use business profile from request data
    const businessProfile = saleData.businessProfile;

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`;
    const receiptDate = new Date(saleData.date).toLocaleDateString();

    // Generate HTML receipt
    const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Receipt - ${receiptNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .business-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .business-info { font-size: 12px; color: #666; }
            .receipt-info { margin: 20px 0; }
            .receipt-number { font-weight: bold; font-size: 16px; }
            .customer-info { background: #f5f5f5; padding: 10px; margin: 15px 0; border-radius: 5px; }
            .sale-details { margin: 20px 0; }
            .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-weight: bold; font-size: 18px; border-top: 2px solid #333; margin-top: 10px; }
            .payment-info { margin: 15px 0; background: #f9f9f9; padding: 10px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
            .thank-you { font-weight: bold; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="business-name">${businessProfile?.business_name || 'Business Name'}</div>
            <div class="business-info">
                ${businessProfile?.business_address || 'Business Address'}<br>
                Phone: ${businessProfile?.phone_number || 'N/A'}<br>
                ${businessProfile?.email || ''}
            </div>
        </div>

        <div class="receipt-info">
            <div class="receipt-number">Receipt #: ${receiptNumber}</div>
            <div>Date: ${receiptDate}</div>
            <div>Time: ${new Date(saleData.date).toLocaleTimeString()}</div>
        </div>

        <div class="customer-info">
            <strong>Customer Information:</strong><br>
            ${saleData.customer.name}<br>
            Phone: ${saleData.customer.phone}
        </div>

        <div class="sale-details">
            <div class="item-row">
                <span><strong>Item</strong></span>
                <span><strong>Qty</strong></span>
                <span><strong>Unit Price</strong></span>
                <span><strong>Total</strong></span>
            </div>
            ${saleData.items.map(item => `
            <div class="item-row">
                <span>${item.productName}</span>
                <span>${item.quantity}</span>
                <span>₵${item.unitPrice.toFixed(2)}</span>
                <span>₵${item.total.toFixed(2)}</span>
            </div>
            ${item.discount > 0 ? `<div class="item-row" style="color: #666; font-size: 12px;">
                <span colspan="4">Discount: -₵${item.discount.toFixed(2)}</span>
            </div>` : ''}
            `).join('')}
        </div>

        <div style="margin: 20px 0;">
            <div class="item-row">
                <span><strong>Subtotal:</strong></span>
                <span><strong>₵${saleData.subtotal.toFixed(2)}</strong></span>
            </div>
            ${saleData.applyTaxes ? `
            <div class="item-row">
                <span>VAT (15%):</span>
                <span>₵${(saleData.totalTax * (0.15 / 0.21)).toFixed(2)}</span>
            </div>
            <div class="item-row">
                <span>NHIL (2.5%):</span>
                <span>₵${(saleData.totalTax * (0.025 / 0.21)).toFixed(2)}</span>
            </div>
            <div class="item-row">
                <span>GETFund (2.5%):</span>
                <span>₵${(saleData.totalTax * (0.025 / 0.21)).toFixed(2)}</span>
            </div>
            <div class="item-row">
                <span>COVID-19 Levy (1%):</span>
                <span>₵${(saleData.totalTax * (0.01 / 0.21)).toFixed(2)}</span>
            </div>
            <div class="item-row" style="font-weight: bold; border-top: 1px solid #ccc; margin-top: 5px; padding-top: 5px;">
                <span>Total Taxes:</span>
                <span>₵${saleData.totalTax.toFixed(2)}</span>
            </div>
            ` : ''}
        </div>

        <div class="total-row">
            <span>TOTAL:</span>
            <span>₵${saleData.total.toFixed(2)}</span>
        </div>

        <div class="payment-info">
            <strong>Payment Method:</strong> ${saleData.paymentMethod.toUpperCase()}<br>
            <strong>Status:</strong> ${saleData.paymentStatus === 'credit' ? 'CREDIT SALE' :
        saleData.paymentStatus === 'partial_payment' ? `PARTIAL PAYMENT (₵${saleData.partialPayment?.toFixed(2)})` : 'PAID IN FULL'}
            ${saleData.notes ? `<br><strong>Notes:</strong> ${saleData.notes}` : ''}
        </div>

        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div><strong>Powered by Tralo</strong> - Business Management System</div>
            <div>Receipt generated on ${new Date().toLocaleString()}</div>
            <div style="margin-top: 10px; font-size: 10px;">Visit https://tralo.com for your business management needs</div>
        </div>
    </body>
    </html>`;

    return new Response(receiptHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="receipt_${receiptNumber}.html"`,
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error generating receipt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);