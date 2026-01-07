import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
    businessProfile: any;
    document: {
        documentNumber: string;
        date: string;
        dueDate: string;
        customerName: string;
        customerAddress: string;
        customerPhone: string;
        items: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            discount: number;
            total: number;
        }>;
        subtotal: number;
        overallDiscount: number;
        tax: number;
        total: number;
        paymentTerms: string;
        notes: string;
        includeVAT: boolean;
    };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    try {
        const requestData: InvoiceRequest = await req.json();
        const { businessProfile, document: doc } = requestData;

        // Generate QR code data (business contact info)
        const qrData = `Business: ${businessProfile?.business_name}\nPhone: ${businessProfile?.phone_number}\nInvoice: ${doc.documentNumber}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

        // Generate HTML invoice
        const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice - ${doc.documentNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20mm; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2c5282; padding-bottom: 20px; margin-bottom: 30px; }
            .company-info { flex: 1; }
            .company-name { font-size: 28px; font-weight: bold; color: #2c5282; margin-bottom: 10px; }
            .company-details { font-size: 11px; color: #666; line-height: 1.6; }
            .branding { text-align: right; }
            .branding img { width: 150px; height: 150px; }
            .invoice-title { font-size: 36px; font-weight: bold; color: #2c5282; text-align: right; margin-bottom: 10px; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-details, .customer-details { flex: 1; }
            .invoice-details { text-align: right; }
            .meta-label { font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; margin-bottom: 3px; }
            .meta-value { font-size: 13px; color: #333; margin-bottom: 10px; }
            .customer-box { background: #f7fafc; padding: 15px; border-left: 4px solid #2c5282; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            thead { background: #2c5282; color: white; }
            th { padding: 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            tbody tr:hover { background: #f7fafc; }
            .text-right { text-align: right; }
            .totals-section { margin-top: 30px; }
            .totals-table { width: 300px; margin-left: auto; }
            .totals-table td { border: none; padding: 8px 12px; }
            .total-row { background: #2c5282; color: white; font-size: 18px; font-weight: bold; }
            .notes-section { margin-top: 40px; padding: 20px; background: #f7fafc; border-radius: 8px; }
            .notes-title { font-weight: 600; color: #2c5282; margin-bottom: 10px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #666; }
            .footer-highlight { color: #2c5282; font-weight: 600; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .status-due { background: #fed7d7; color: #c53030; }
            .status-paid { background: #c6f6d5; color: #22543d; }
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
                <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
        </div>

        <div class="invoice-title">INVOICE</div>

        <div class="invoice-meta">
            <div class="customer-details">
                <div class="customer-box">
                    <div class="meta-label">Bill To:</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${doc.customerName}</div>
                    ${doc.customerAddress ? `<div>${doc.customerAddress}</div>` : ''}
                    <div>Phone: ${doc.customerPhone}</div>
                </div>
            </div>
            <div class="invoice-details">
                <div class="meta-label">Invoice Number</div>
                <div class="meta-value">${doc.documentNumber}</div>
                <div class="meta-label">Invoice Date</div>
                <div class="meta-value">${new Date(doc.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div class="meta-label">Due Date</div>
                <div class="meta-value">${doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'On Receipt'}</div>
                <div class="meta-label">Payment Terms</div>
                <div class="meta-value">${doc.paymentTerms}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th class="text-right" style="width: 10%;">Qty</th>
                    <th class="text-right" style="width: 15%;">Unit Price</th>
                    <th class="text-right" style="width: 10%;">Discount</th>
                    <th class="text-right" style="width: 15%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${doc.items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">¢${item.unitPrice.toFixed(2)}</td>
                        <td class="text-right">${item.discount > 0 ? `¢${item.discount.toFixed(2)}` : '-'}</td>
                        <td class="text-right">¢${item.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">¢${doc.subtotal.toFixed(2)}</td>
                </tr>
                ${doc.overallDiscount > 0 ? `
                <tr style="color: #22543d;">
                    <td>Overall Discount:</td>
                    <td class="text-right">-¢${doc.overallDiscount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${doc.includeVAT ? `
                <tr>
                    <td>VAT (15%):</td>
                    <td class="text-right">¢${(doc.tax * (0.15 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>NHIL (2.5%):</td>
                    <td class="text-right">¢${(doc.tax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>GETFund (2.5%):</td>
                    <td class="text-right">¢${(doc.tax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td><strong>Total Taxes (20%):</strong></td>
                    <td class="text-right"><strong>¢${doc.tax.toFixed(2)}</strong></td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td>TOTAL DUE:</td>
                    <td class="text-right">¢${doc.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        ${doc.notes ? `
        <div class="notes-section">
            <div class="notes-title">Notes / Terms:</div>
            <div>${doc.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
            <div class="thank-you footer-highlight">Thank you for your business!</div>
            <div>This is a computer-generated invoice and requires no signature.</div>
            <div style="margin-top: 10px;">Scan the QR code to save our contact information.</div>
        </div>
    </body>
    </html>
    `;

        return new Response(invoiceHtml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
};

serve(handler);
