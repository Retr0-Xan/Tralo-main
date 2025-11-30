import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dispatchSalesDataUpdated } from "@/lib/sales-events";

interface CSVRow {
    date: string;
    time?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    customer_name?: string;
    customer_phone?: string;
    payment_method: string;
    apply_taxes: boolean;
    notes?: string;
}

const BulkSalesUpload = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const template = `date,time,product_name,quantity,unit_price,customer_name,customer_phone,payment_method,apply_taxes,notes
2024-11-01,14:30,Rice,50,2.50,John Doe,0241234567,cash,true,Bulk purchase
2024-11-02,,Cooking Oil,20,5.00,,,mobile money,false,
2024-11-03,09:15,Sugar,100,1.50,Jane Smith,0201234567,bank transfer,true,Regular customer`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales_upload_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
            title: "Template downloaded",
            description: "Use this template to format your sales data",
        });
    };

    const parseCSV = (text: string): CSVRow[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or has no data rows');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['date', 'product_name', 'quantity', 'unit_price', 'payment_method'];

        for (const required of requiredHeaders) {
            if (!headers.includes(required)) {
                throw new Error(`Missing required column: ${required}`);
            }
        }

        const rows: CSVRow[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue;

            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            rows.push({
                date: row.date,
                time: row.time || '',
                product_name: row.product_name,
                quantity: parseFloat(row.quantity),
                unit_price: parseFloat(row.unit_price),
                customer_name: row.customer_name || '',
                customer_phone: row.customer_phone || 'walk-in',
                payment_method: row.payment_method.toLowerCase(),
                apply_taxes: row.apply_taxes?.toLowerCase() === 'true',
                notes: row.notes || '',
            });
        }

        return rows;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast({
                title: "Invalid file type",
                description: "Please upload a CSV file",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        setUploadResults(null);

        try {
            // Get business profile
            const { data: businessProfile } = await supabase
                .from('business_profiles')
                .select('id')
                .eq('user_id', user!.id)
                .single();

            if (!businessProfile) {
                throw new Error('Business profile not found');
            }

            // Read and parse CSV
            const text = await file.text();
            const rows = parseCSV(text);

            console.log(`Processing ${rows.length} sales records...`);

            let successCount = 0;
            let failedCount = 0;
            const errors: string[] = [];
            const recordedAt = new Date().toISOString();

            // Process each row
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNum = i + 2; // +2 because row 1 is header and array is 0-indexed

                try {
                    // Validate row data
                    if (!row.date || !row.product_name || !row.quantity || !row.unit_price) {
                        throw new Error(`Missing required fields`);
                    }

                    if (isNaN(row.quantity) || row.quantity <= 0) {
                        throw new Error(`Invalid quantity: ${row.quantity}`);
                    }

                    if (isNaN(row.unit_price) || row.unit_price < 0) {
                        throw new Error(`Invalid unit price: ${row.unit_price}`);
                    }

                    // Construct sale datetime
                    let saleDateTimeString = row.date;
                    if (row.time) {
                        saleDateTimeString = `${row.date}T${row.time}`;
                    }
                    const saleDateTime = new Date(saleDateTimeString);

                    if (isNaN(saleDateTime.getTime())) {
                        throw new Error(`Invalid date format: ${row.date}`);
                    }

                    if (saleDateTime > new Date()) {
                        throw new Error(`Date cannot be in the future: ${row.date}`);
                    }

                    // Calculate amounts
                    const subtotal = row.quantity * row.unit_price;
                    const totalTax = row.apply_taxes ? subtotal * 0.21 : 0;
                    const itemVAT = row.apply_taxes ? totalTax * (0.15 / 0.21) : 0;
                    const itemNHIL = row.apply_taxes ? totalTax * (0.025 / 0.21) : 0;
                    const itemGETFund = row.apply_taxes ? totalTax * (0.025 / 0.21) : 0;
                    const itemCovid19 = row.apply_taxes ? totalTax * (0.01 / 0.21) : 0;

                    // Validate payment method
                    const validPaymentMethods = ['cash', 'credit', 'mobile money', 'bank transfer'];
                    if (!validPaymentMethods.includes(row.payment_method)) {
                        throw new Error(`Invalid payment method: ${row.payment_method}`);
                    }

                    // Insert sale record
                    const { error: insertError } = await supabase
                        .from('customer_purchases')
                        .insert({
                            business_id: businessProfile.id,
                            product_name: row.product_name,
                            customer_phone: row.customer_phone,
                            amount: subtotal,
                            quantity: row.quantity,
                            payment_method: row.payment_method,
                            purchase_date: saleDateTime.toISOString(),
                            vat_amount: itemVAT,
                            nhil_amount: itemNHIL,
                            getfund_amount: itemGETFund,
                            covid19_amount: itemCovid19,
                            total_tax: totalTax,
                            created_at: recordedAt,
                        });

                    if (insertError) throw insertError;

                    successCount++;
                } catch (error: any) {
                    failedCount++;
                    errors.push(`Row ${rowNum}: ${error.message}`);
                    console.error(`Error processing row ${rowNum}:`, error);
                }
            }

            setUploadResults({ success: successCount, failed: failedCount, errors });

            if (successCount > 0) {
                dispatchSalesDataUpdated();
                toast({
                    title: "Upload complete",
                    description: `Successfully uploaded ${successCount} sales records${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
                });
            } else {
                toast({
                    title: "Upload failed",
                    description: "No records were uploaded successfully",
                    variant: "destructive",
                });
            }

        } catch (error: any) {
            console.error('Error uploading CSV:', error);
            toast({
                title: "Upload error",
                description: error.message || "Failed to process CSV file",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    Bulk Sales Upload (CSV)
                </CardTitle>
                <CardDescription>
                    Upload multiple past sales at once using a CSV file. All entries will be timestamped with the current date/time.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Required CSV Format</h4>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        <li><strong>date</strong> (YYYY-MM-DD) - Sale date</li>
                        <li><strong>time</strong> (HH:MM, optional) - Sale time</li>
                        <li><strong>product_name</strong> - Product name</li>
                        <li><strong>quantity</strong> - Number of units sold</li>
                        <li><strong>unit_price</strong> - Price per unit</li>
                        <li><strong>customer_name</strong> (optional) - Customer name</li>
                        <li><strong>customer_phone</strong> (optional) - Customer phone</li>
                        <li><strong>payment_method</strong> - cash, credit, mobile money, or bank transfer</li>
                        <li><strong>apply_taxes</strong> (true/false) - Apply 21% taxes</li>
                        <li><strong>notes</strong> (optional) - Additional notes</li>
                    </ul>
                </div>

                <Button
                    variant="outline"
                    className="w-full"
                    onClick={downloadTemplate}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                </Button>

                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload CSV File"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Click to select a CSV file or drag and drop
                    </p>
                </div>

                {uploadResults && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div>
                                    <div className="text-sm font-medium text-green-900 dark:text-green-100">Success</div>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{uploadResults.success}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                <div>
                                    <div className="text-sm font-medium text-red-900 dark:text-red-100">Failed</div>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{uploadResults.failed}</div>
                                </div>
                            </div>
                        </div>

                        {uploadResults.errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 mb-2">Errors:</h4>
                                <ul className="text-xs text-red-800 dark:text-red-200 space-y-1 max-h-40 overflow-y-auto">
                                    {uploadResults.errors.map((error, index) => (
                                        <li key={index}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BulkSalesUpload;
