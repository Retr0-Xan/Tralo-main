import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProformaInvoiceRequest {
    businessProfile: any;
    document: {
        documentNumber: string;
        date: string;
        validUntil: string;
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
        notes: string;
        includeVAT: boolean;
        paymentTerms?: string;
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
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const requestData: ProformaInvoiceRequest = await req.json();
        const { businessProfile, document: doc } = requestData;

        // Calculate validity period
        const validityDays = Math.ceil((new Date(doc.validUntil).getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24));

        // File name for storage
        const fileName = `proforma-invoices/${doc.documentNumber}_${Date.now()}.html`;

        // Generate HTML proforma invoice as a function to allow QR code updates
        const generateProformaHtml = (qrCodeUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Proforma Invoice - ${doc.documentNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 15mm; background: #fff; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: bold; color: rgba(220, 38, 38, 0.08); z-index: -1; text-transform: uppercase; pointer-events: none; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 3px solid #dc2626; padding: 20px; margin-bottom: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); }
            .company-info { flex: 1; }
            .company-name { font-size: 24px; font-weight: bold; color: #991b1b; margin-bottom: 8px; }
            .company-details { font-size: 11px; color: #475569; line-height: 1.6; }
            .branding { text-align: right; }
            .branding img { width: 120px; height: 120px; border: 2px solid #dc2626; border-radius: 8px; }
            .proforma-title { font-size: 32px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; padding: 15px; background: #fef2f2; border-left: 6px solid #dc2626; border-right: 6px solid #dc2626; }
            .proforma-subtitle { font-size: 14px; color: #991b1b; text-align: center; margin-top: 8px; font-weight: 600; text-transform: uppercase; }
            .validity-banner { background: #fef3c7; border: 2px dashed #f59e0b; padding: 12px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .validity-text { color: #92400e; font-weight: 600; }
            .validity-date { color: #78350f; font-weight: 700; font-size: 16px; }
            .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-box { border: 2px solid #cbd5e1; padding: 15px; border-radius: 8px; background: #f8fafc; }
            .info-box-title { font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #dc2626; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
            .info-label { font-weight: 600; color: #64748b; }
            .info-value { color: #1e293b; }
            .document-meta { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #fff7ed; border: 2px solid #f59e0b; border-radius: 8px; }
            .meta-item { text-align: center; }
            .meta-label { font-size: 11px; color: #92400e; font-weight: 600; }
            .meta-value { font-size: 14px; color: #78350f; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            thead { background: #991b1b; color: white; }
            th { padding: 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; border: 1px solid #991b1b; }
            td { padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; background: white; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-section { margin-top: 20px; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; background: #fef2f2; }
            .totals-table { width: 350px; margin-left: auto; }
            .totals-table td { border: none; padding: 8px; }
            .total-row { background: #991b1b; color: white; font-size: 16px; font-weight: bold; }
            .notes-section { margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
            .notes-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
            .terms-section { margin-top: 20px; padding: 15px; background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; }
            .terms-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 14px; }
            .terms-list { font-size: 11px; color: #475569; line-height: 1.8; margin-top: 8px; }
            .terms-list li { margin: 4px 0; }
            .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 10px; color: #64748b; }
            .footer-highlight { color: #dc2626; font-weight: 600; }
            .disclaimer { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin-top: 15px; border-radius: 4px; font-size: 10px; color: #991b1b; text-align: center; }
            @media print { body { padding: 0; } .watermark { font-size: 120px; } }
        </style>
    </head>
    <body>
        <div class="watermark">PROFORMA</div>
        
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
                <img src="${qrCodeUrl}" alt="Proforma Invoice QR Code" />
            </div>
        </div>

        <div class="proforma-title">
            PROFORMA INVOICE
            <div class="proforma-subtitle">Quotation / Estimate - Not a Tax Invoice</div>
        </div>

        <div class="validity-banner">
            <div class="validity-text">⏰ Valid For: ${validityDays} Days</div>
            <div class="validity-date">Expires: ${new Date(doc.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <div class="document-meta">
            <div class="meta-item">
                <div class="meta-label">Proforma Number</div>
                <div class="meta-value">${doc.documentNumber}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Issue Date</div>
                <div class="meta-value">${new Date(doc.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Valid Until</div>
                <div class="meta-value">${new Date(doc.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
        </div>

        <div class="info-section">
            <div class="info-box">
                <div class="info-box-title">From (Seller)</div>
                <div class="info-row">
                    <span class="info-label">Business:</span>
                    <span class="info-value">${businessProfile?.business_name || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${businessProfile?.business_address || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${businessProfile?.phone_number || 'N/A'}</span>
                </div>
                ${businessProfile?.email ? `
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${businessProfile.email}</span>
                </div>
                ` : ''}
            </div>
            <div class="info-box">
                <div class="info-box-title">To (Prospective Customer)</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${doc.customerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${doc.customerAddress || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${doc.customerPhone}</span>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 40%;">Item Description</th>
                    <th class="text-center" style="width: 12%;">Quantity</th>
                    <th class="text-right" style="width: 13%;">Unit Price</th>
                    <th class="text-right" style="width: 13%;">Discount</th>
                    <th class="text-right" style="width: 17%;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${doc.items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.description}</td>
                        <td class="text-center"><strong>${item.quantity}</strong></td>
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
                    <td class="text-right">¢${doc.subtotal.toFixed(2)}</td>
                </tr>
                ${doc.overallDiscount > 0 ? `
                <tr>
                    <td><strong>Overall Discount:</strong></td>
                    <td class="text-right" style="color: #16a34a;">-¢${doc.overallDiscount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${doc.includeVAT ? `
                <tr>
                    <td><strong>VAT (15%):</strong></td>
                    <td class="text-right">¢${(doc.tax * (0.15 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>NHIL (2.5%):</strong></td>
                    <td class="text-right">¢${(doc.tax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>GETFund (2.5%):</strong></td>
                    <td class="text-right">¢${(doc.tax * (0.025 / 0.20)).toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                    <td><strong>Total Taxes (20%):</strong></td>
                    <td class="text-right"><strong>¢${doc.tax.toFixed(2)}</strong></td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td><strong>ESTIMATED TOTAL:</strong></td>
                    <td class="text-right">¢${doc.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        ${doc.notes ? `
        <div class="notes-section">
            <div class="notes-title">📝 Additional Notes:</div>
            <div style="font-size: 13px;">${doc.notes}</div>
        </div>
        ` : ''}

        <div class="terms-section">
            <div class="terms-title">💼 Terms & Conditions:</div>
            <div class="terms-list">
                <ul>
                    <li>✓ This is a proforma invoice (quote/estimate) and not a valid tax invoice</li>
                    <li>✓ Prices are subject to change after the validity period</li>
                    <li>✓ Final invoice will be issued upon order confirmation and payment</li>
                    ${doc.paymentTerms ? `<li>✓ Payment Terms: ${doc.paymentTerms}</li>` : ''}
                    <li>✓ All prices are in Ghana Cedis (GH¢)</li>
                    <li>✓ Please confirm your order before the expiry date</li>
                </ul>
            </div>
        </div>

        <div class="disclaimer">
            ⚠️ IMPORTANT: This proforma invoice is for quotation purposes only and does not constitute a demand for payment.
            A final tax invoice will be issued upon order confirmation.
        </div>

        <div class="footer">
            <div class="footer-highlight">Thank you for considering our services!</div>
            <div>For inquiries, please contact us at ${businessProfile?.phone_number || 'our phone number'}</div>
            <div style="margin-top: 8px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            <div style="margin-top: 8px;">Scan QR code to download this proforma invoice</div>
        </div>
    </body>
    </html>
    `;

        // Upload with placeholder QR
        const tempHtml = generateProformaHtml('https://via.placeholder.com/150');
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, new Blob([tempHtml], { type: 'text/html' }), {
                contentType: 'text/html',
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Proforma Invoice: ${doc.documentNumber}`)}`;
            return new Response(generateProformaHtml(fallbackQr), {
                headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            });
        }

        // Generate download URL for QR code
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const downloadUrl = `${supabaseUrl}/functions/v1/download-document?file=${encodeURIComponent(fileName)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(downloadUrl)}`;

        // Update with actual QR
        const finalHtml = generateProformaHtml(qrCodeUrl);
        await supabase.storage.from('documents').update(fileName, new Blob([finalHtml], { type: 'text/html' }), {
            contentType: 'text/html',
            upsert: true
        });

        return new Response(finalHtml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error generating proforma invoice:', error);
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
