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
        unitOfMeasure?: string;
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
    // Past sale markers
    isPastSale?: boolean;
    recordedAt?: string;
    receiptNumber?: string;
    includeTime?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const saleData: ReceiptRequest = await req.json();

        // Use business profile from request data
        const businessProfile = saleData.businessProfile;

        // Generate receipt number (use provided number for past sales or generate new)
        const receiptNumber = saleData.receiptNumber || `RCP-${Date.now()}`;
        const receiptDate = new Date(saleData.date).toLocaleDateString();
        const receiptTime = new Date(saleData.date).toLocaleTimeString();
        const isPastSale = saleData.isPastSale || false;
        // For past sales, only include time if explicitly set to true; for regular sales, default to true
        const includeTime = isPastSale ? (saleData.includeTime === true) : true;
        const recordedAt = saleData.recordedAt ? new Date(saleData.recordedAt).toLocaleString() : null;

        // File name for storage
        const fileName = `receipts/${receiptNumber}.html`;

        // Generate HTML receipt as a function to allow QR code updates
        const generateReceiptHtml = (qrCodeUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Receipt - ${receiptNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 3px solid #16a34a; padding: 20px; margin-bottom: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
            .company-info { flex: 1; }
            .company-name { font-size: 24px; font-weight: bold; color: #15803d; margin-bottom: 8px; }
            .company-details { font-size: 11px; color: #475569; line-height: 1.6; }
            .branding { text-align: right; }
            .branding img { width: 120px; height: 120px; border: 2px solid #16a34a; border-radius: 8px; }
            .receipt-title { font-size: 32px; font-weight: bold; color: #15803d; text-align: center; margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 6px solid #16a34a; border-right: 6px solid #16a34a; }
            .receipt-meta { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #fff7ed; border: 2px solid #f59e0b; border-radius: 8px; }
            .meta-item { text-align: center; }
            .meta-label { font-size: 11px; color: #92400e; font-weight: 600; }
            .meta-value { font-size: 14px; color: #78350f; font-weight: 700; margin-top: 4px; }
            .customer-info { border: 2px solid #cbd5e1; padding: 15px; margin: 20px 0; border-radius: 8px; background: #f8fafc; }
            .customer-title { font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #16a34a; }
            .customer-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
            .customer-label { font-weight: 600; color: #64748b; }
            .customer-value { color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            thead { background: #15803d; color: white; }
            th { padding: 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; border: 1px solid #15803d; }
            td { padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; background: white; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-section { margin-top: 20px; border: 2px solid #16a34a; padding: 15px; border-radius: 8px; background: #f0fdf4; }
            .totals-table { width: 350px; margin-left: auto; }
            .totals-table td { border: none; padding: 8px; }
            .total-row { background: #15803d; color: white; font-size: 16px; font-weight: bold; }
            .payment-info { margin-top: 20px; padding: 15px; background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; }
            .payment-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 14px; }
            .payment-details { font-size: 13px; color: #1e293b; line-height: 1.8; }
            .payment-status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; }
            .status-paid { background: #dcfce7; color: #15803d; }
            .status-credit { background: #fee2e2; color: #991b1b; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .notes-section { margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
            .notes-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
            .past-sale-banner { background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%); border: 3px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center; }
            .past-sale-title { font-size: 18px; font-weight: bold; color: #92400e; text-transform: uppercase; margin-bottom: 8px; }
            .past-sale-details { font-size: 12px; color: #78350f; line-height: 1.6; }
            .past-sale-label { display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
            .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 10px; color: #64748b; }
            .footer-highlight { color: #15803d; font-weight: 600; }
            @media print { body { padding: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <div class="company-name">${businessProfile?.business_name || 'Your Business'}</div>
                <div class="company-details">
                    ${businessProfile?.business_address || 'Business Address'}<br>
                    Phone: ${businessProfile?.phone_number || 'N/A'}<br>
                    ${businessProfile?.email ? `Email: ${businessProfile.email}` : ''}
                </div>
            </div>
            <div class="branding">
                <img src="${qrCodeUrl}" alt="Receipt QR Code" />
            </div>
        </div>

        <div class="receipt-title">SALES RECEIPT</div>

        ${isPastSale ? `
        <div class="past-sale-banner">
            <div class="past-sale-label">⏱️ BACKDATED ENTRY</div>
            <div class="past-sale-title">Past Sale Record</div>
            <div class="past-sale-details">
                <strong>Original Sale Date:</strong> ${receiptDate}${includeTime ? ` at ${receiptTime}` : ''}<br>
                <strong>Recorded On:</strong> ${recordedAt}<br>
                <strong>Note:</strong> This sale occurred on a previous date and was entered retrospectively into the system for record-keeping purposes.
            </div>
        </div>
        ` : ''}

        <div class="receipt-meta">
            <div class="meta-item">
                <div class="meta-label">Receipt Number</div>
                <div class="meta-value">${receiptNumber}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Date</div>
                <div class="meta-value">${receiptDate}</div>
            </div>
            ${includeTime ? `
            <div class="meta-item">
                <div class="meta-label">Time</div>
                <div class="meta-value">${receiptTime}</div>
            </div>
            ` : ''}
        </div>

        <div class="customer-info">
            <div class="customer-title">Customer Information</div>
            <div class="customer-row">
                <span class="customer-label">Name:</span>
                <span class="customer-value">${saleData.customer.name}</span>
            </div>
            <div class="customer-row">
                <span class="customer-label">Phone:</span>
                <span class="customer-value">${saleData.customer.phone}</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 40%;">Item</th>
                    <th class="text-center" style="width: 15%;">Quantity</th>
                    <th class="text-right" style="width: 15%;">Unit Price</th>
                    <th class="text-right" style="width: 10%;">Discount</th>
                    <th class="text-right" style="width: 15%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${saleData.items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.productName}</td>
                        <td class="text-center"><strong>${item.quantity} ${item.unitOfMeasure || 'units'}</strong></td>
                        <td class="text-right">¢${item.unitPrice.toFixed(2)}</td>
                        <td class="text-right" style="color: ${item.discount > 0 ? '#16a34a' : '#64748b'};">
                            ${item.discount > 0 ? `-¢${item.discount.toFixed(2)}` : '-'}
                        </td>
                        <td class="text-right"><strong>¢${item.total.toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td class="text-right">¢${saleData.subtotal.toFixed(2)}</td>
                </tr>
                ${saleData.applyTaxes ? `
                <tr>
                    <td><strong>VAT (15%):</strong></td>
                    <td class="text-right">¢${(saleData.totalTax * (0.15 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>NHIL (2.5%):</strong></td>
                    <td class="text-right">¢${(saleData.totalTax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>GETFund (2.5%):</strong></td>
                    <td class="text-right">¢${(saleData.totalTax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td><strong>Total Taxes (20%):</strong></td>
                    <td class="text-right">¢${saleData.totalTax.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td class="text-right">¢${saleData.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <div class="payment-info">
            <div class="payment-title">💳 Payment Information</div>
            <div class="payment-details">
                <strong>Method:</strong> ${saleData.paymentMethod.toUpperCase()}<br>
                <strong>Status:</strong> 
                <span class="payment-status ${saleData.paymentStatus === 'paid' ? 'status-paid' :
                saleData.paymentStatus === 'credit' ? 'status-credit' : 'status-partial'
            }">
                    ${saleData.paymentStatus === 'credit' ? 'CREDIT SALE' :
                saleData.paymentStatus === 'partial_payment' ? `PARTIAL PAYMENT (¢${saleData.partialPayment?.toFixed(2)})` :
                    'PAID IN FULL'}
                </span>
            </div>
        </div>

        ${saleData.notes ? `
        <div class="notes-section">
            <div class="notes-title">📝 Notes:</div>
            <div style="font-size: 13px;">${saleData.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
            <div class="footer-highlight">Thank you for your business!</div>
            <div><strong>Powered by TRALO</strong> - Business Management System</div>
            <div style="margin-top: 8px;">For inquiries: ${businessProfile?.phone_number || 'Contact us'} ${businessProfile?.email ? `| ${businessProfile.email}` : ''}</div>
            <div style="margin-top: 8px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            <div style="margin-top: 8px;">Scan QR code to download this receipt</div>
        </div>
    </body>
    </html>
    `;

        // Upload with placeholder QR
        const tempHtml = generateReceiptHtml('https://via.placeholder.com/150');
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, new Blob([tempHtml], { type: 'text/html' }), {
                contentType: 'text/html',
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Receipt: ${receiptNumber}`)}`;
            return new Response(generateReceiptHtml(fallbackQr), {
                headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            });
        }

        // Generate download URL for QR code (renders HTML properly)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const downloadUrl = `${supabaseUrl}/functions/v1/download-document?file=${encodeURIComponent(fileName)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(downloadUrl)}`;

        // Update with actual QR
        const finalHtml = generateReceiptHtml(qrCodeUrl);
        await supabase.storage.from('documents').update(fileName, new Blob([finalHtml], { type: 'text/html' }), {
            contentType: 'text/html',
            upsert: true
        });

        return new Response(finalHtml, {
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