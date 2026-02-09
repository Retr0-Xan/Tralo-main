import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch QR code and convert to base64
async function fetchQRCodeAsBase64(url: string): Promise<string> {
    try {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
        const response = await fetch(qrApiUrl);
        if (!response.ok) throw new Error('Failed to fetch QR code');

        const arrayBuffer = await response.arrayBuffer();
        const base64 = encode(new Uint8Array(arrayBuffer));
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error('Error fetching QR code:', error);
        const placeholderSvg = `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="150" height="150" fill="#f0f0f0"/><text x="75" y="75" text-anchor="middle" font-size="14" fill="#666">QR Code</text></svg>`;
        const base64Svg = encode(new TextEncoder().encode(placeholderSvg));
        return `data:image/svg+xml;base64,${base64Svg}`;
    }
}

interface WaybillRequest {
    businessProfile: any;
    document: {
        documentNumber: string;
        date: string;
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

        const requestData: WaybillRequest = await req.json();
        const { businessProfile, document: doc } = requestData;

        const fileName = `waybills/${doc.documentNumber}_${Date.now()}.html`;

        // Generate HTML waybill as function
        const generateWaybillHtml = (qrCodeUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Waybill - ${doc.documentNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 15mm; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border: 3px solid #2563eb; padding: 20px; margin-bottom: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); }
            .company-info { flex: 1; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 8px; }
            .company-details { font-size: 11px; color: #475569; line-height: 1.6; }
            .branding { text-align: right; }
            .branding img { width: 120px; height: 120px; border: 2px solid #2563eb; border-radius: 8px; }
            .waybill-title { font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; margin: 20px 0; padding: 15px; background: #e0f2fe; border-left: 6px solid #2563eb; border-right: 6px solid #2563eb; }
            .shipment-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-box { border: 2px solid #cbd5e1; padding: 15px; border-radius: 8px; background: #f8fafc; }
            .info-box-title { font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
            .info-label { font-weight: 600; color: #64748b; }
            .info-value { color: #1e293b; }
            .document-meta { text-align: center; margin: 20px 0; padding: 15px; background: #fff7ed; border: 2px dashed #f59e0b; border-radius: 8px; }
            .meta-item { display: inline-block; margin: 0 20px; }
            .meta-label { font-size: 11px; color: #92400e; font-weight: 600; }
            .meta-value { font-size: 14px; color: #78350f; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            thead { background: #1e40af; color: white; }
            th { padding: 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; border: 1px solid #1e40af; }
            td { padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; background: white; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-section { margin-top: 20px; border: 2px solid #2563eb; padding: 15px; border-radius: 8px; background: #f0f9ff; }
            .totals-table { width: 350px; margin-left: auto; }
            .totals-table td { border: none; padding: 8px; }
            .total-row { background: #1e40af; color: white; font-size: 16px; font-weight: bold; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
            .signature-box { border-top: 2px solid #64748b; padding-top: 10px; }
            .signature-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .notes-section { margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
            .notes-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
            .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 10px; color: #64748b; }
            .footer-highlight { color: #1e40af; font-weight: 600; }
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
                <img src="${qrCodeUrl}" alt="Waybill QR Code" />
            </div>
        </div>

        <div class="waybill-title">DELIVERY WAYBILL</div>

        <div class="document-meta">
            <div class="meta-item">
                <div class="meta-label">Waybill Number</div>
                <div class="meta-value">${doc.documentNumber}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Date Issued</div>
                <div class="meta-value">${new Date(doc.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Time</div>
                <div class="meta-value">${new Date(doc.date).toLocaleTimeString()}</div>
            </div>
        </div>

        <div class="shipment-info">
            <div class="info-box">
                <div class="info-box-title">🏢 From (Shipper)</div>
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
            </div>
            <div class="info-box">
                <div class="info-box-title">📍 To (Consignee)</div>
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
                    <th style="width: 45%;">Item Description</th>
                    <th class="text-center" style="width: 15%;">Quantity</th>
                    <th class="text-right" style="width: 15%;">Unit Price</th>
                    <th class="text-right" style="width: 20%;">Total Value</th>
                </tr>
            </thead>
            <tbody>
                ${doc.items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.description}</td>
                        <td class="text-center"><strong>${item.quantity}</strong></td>
                        <td class="text-right">¢${item.unitPrice.toFixed(2)}</td>
                        <td class="text-right"><strong>¢${item.total.toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td><strong>Total Items:</strong></td>
                    <td class="text-right">${doc.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                </tr>
                <tr>
                    <td><strong>Subtotal Value:</strong></td>
                    <td class="text-right">¢${doc.subtotal.toFixed(2)}</td>
                </tr>
                ${doc.overallDiscount > 0 ? `
                <tr>
                    <td><strong>Discount:</strong></td>
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
                    <td><strong>TOTAL VALUE:</strong></td>
                    <td class="text-right">¢${doc.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        ${doc.notes ? `
        <div class="notes-section">
            <div class="notes-title">⚠️ Special Instructions / Notes:</div>
            <div style="font-size: 13px;">${doc.notes}</div>
        </div>
        ` : ''}

        <div class="signatures">
            <div class="signature-box">
                <div style="height: 50px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                <div class="signature-label">Prepared By</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${businessProfile?.owner_name || 'Staff'}</div>
            </div>
            <div class="signature-box">
                <div style="height: 50px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                <div class="signature-label">Driver / Courier</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Name & Signature</div>
            </div>
            <div class="signature-box">
                <div style="height: 50px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                <div class="signature-label">Received By</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${doc.customerName}</div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-highlight">This waybill serves as proof of delivery</div>
            <div>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
            <div style="margin-top: 8px;">Scan QR code to download this waybill</div>
        </div>
    </body>
    </html>
    `;

        // Upload with placeholder QR
        const tempHtml = generateWaybillHtml('https://via.placeholder.com/150');
        // Generate download URL for QR code (renders HTML properly)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const downloadUrl = `${supabaseUrl}/functions/v1/download-document?file=${encodeURIComponent(fileName)}`;

        // Fetch QR code and convert to base64 data URI for inline embedding
        const qrCodeDataUri = await fetchQRCodeAsBase64(downloadUrl);

        // Generate final HTML with embedded base64 QR code
        const finalHtml = generateWaybillHtml(qrCodeDataUri);

        // Upload once with the proper QR code embedded
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, new Blob([finalHtml], { type: 'text/html' }), {
                contentType: 'text/html',
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return new Response(finalHtml, {
                headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            });
        }

        return new Response(finalHtml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error generating waybill:', error);
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
