import { useState, useEffect } from "react";
import { FileText, Receipt, FileSpreadsheet, Truck, Plus, Download, Search, Filter, Eye, Undo2, Clock, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DocumentCreator from "./DocumentCreator";
import DocumentHistory from "./DocumentHistory";
import ExternalReceiptsManager from "./ExternalReceiptsManager";
import ProformaInvoiceManager from "./ProformaInvoiceManager";
import BusinessNotes from "./BusinessNotes";
import ReversalReceiptsHistory from "./ReversalReceiptsHistory";
import PastSalesRecording from "./PastSalesRecording";
import BulkSalesUpload from "./BulkSalesUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReportsDownload } from "@/hooks/useReportsDownload";

interface RecentDocument {
  id: string;
  type: string;
  number: string;
  customer: string;
  amount: number;
  date: string;
  status: string;
  icon: any;
  color: string;
}

// Recent Documents Component
const RecentDocumentsList = () => {
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentDocuments();

    // Listen for sales data updates to refresh documents
    const handleSalesUpdate = () => {
      console.log('Sales data updated, refreshing recent documents...');
      fetchRecentDocuments();
    };

    window.addEventListener('sales-data-updated', handleSalesUpdate);

    return () => {
      window.removeEventListener('sales-data-updated', handleSalesUpdate);
    };
  }, [user]);

  const fetchRecentDocuments = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch only issued documents from the documents table
      const { data: documentsData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'issued')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const documents: RecentDocument[] = [];

      if (documentsData) {
        documentsData.forEach((doc: any) => {
          const getIconAndColor = (docType: string) => {
            switch (docType) {
              case 'receipt':
                return { icon: Receipt, color: 'bg-green-500' };
              case 'invoice':
                return { icon: FileText, color: 'bg-blue-500' };
              case 'waybill':
                return { icon: Truck, color: 'bg-orange-500' };
              case 'purchase_order':
                return { icon: FileSpreadsheet, color: 'bg-purple-500' };
              case 'reversal_receipt':
                return { icon: Undo2, color: 'bg-red-500' };
              default:
                return { icon: FileText, color: 'bg-gray-500' };
            }
          };

          const { icon, color } = getIconAndColor(doc.document_type);

          documents.push({
            id: doc.id,
            type: doc.document_type,
            number: doc.document_number,
            customer: doc.customer_name || 'Customer',
            amount: doc.total_amount || 0,
            date: doc.created_at,
            status: doc.status,
            icon,
            color
          });
        });
      }

      setRecentDocs(documents);

    } catch (error) {
      console.error('Error fetching recent documents:', error);
      setRecentDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (docId: string) => {
    try {
      console.log('Attempting to view document:', docId);

      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

      if (error) {
        console.error('Error fetching document:', error);
        throw error;
      }

      console.log('Document fetched:', document);

      if (document?.file_url) {
        // If there's a file URL, open it
        window.open(document.file_url, '_blank');
      } else if (document?.content) {
        // Create a properly formatted HTML document
        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        console.log('Document content:', content);

        const htmlContent = createDocumentHTML(document, content);

        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        } else {
          // If popup is blocked, create a downloadable file
          downloadAsHTML(document.document_number, htmlContent);
        }
      } else {
        toast({
          title: "Document Preview",
          description: `${document.document_number} - No content available for preview`,
        });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createDocumentHTML = (document: any, content: any) => {
    const businessInfo = content.business || {};
    const customer = content.customer || {};
    const items = content.items || [];
    const totals = content.totals || {};

    // Handle reversal receipts specially
    const isReversalReceipt = document.document_type === 'reversal_receipt';

    // For reversal receipts, normalize the data structure
    let normalizedItems = items;
    let normalizedCustomer = customer;
    let normalizedTotals = totals;

    if (isReversalReceipt) {
      normalizedItems = items.map((item: any) => ({
        name: item.item_name || item.name || item.description || 'Reversed Item',
        description: item.item_name || item.name || item.description || 'Reversed Item',
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || item.unitPrice || 0,
        total: item.total_price || item.total || 0
      }));

      normalizedCustomer = {
        name: content.customer?.name || document.customer_name || 'Walk-in Customer',
        phone: content.customer?.phone || customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      };

      const subtotal = content.original_amount || document.total_amount || 0;
      normalizedTotals = {
        subtotal: subtotal,
        total: subtotal,
        taxAmount: 0,
        discount: 0
      };
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${document.document_number}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          .document-header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
          }
          .document-title { 
            font-size: 28px; 
            font-weight: bold; 
            color: #007bff; 
            margin: 0;
            text-transform: uppercase;
          }
          .document-number { 
            font-size: 18px; 
            color: #666; 
            margin: 5px 0;
          }
          .document-date { 
            color: #666; 
            font-size: 14px;
          }
          .section { 
            margin: 20px 0; 
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            color: #007bff; 
            margin-bottom: 10px;
            border-left: 4px solid #007bff;
            padding-left: 10px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-box {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 3px solid #007bff;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .items-table th, .items-table td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          .items-table th { 
            background: #007bff; 
            color: white;
            font-weight: bold;
          }
          .items-table tr:nth-child(even) { 
            background: #f8f9fa; 
          }
          .totals-section { 
            text-align: right; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .total-row { 
            margin: 5px 0; 
            font-size: 16px;
          }
          .total-final { 
            font-size: 20px; 
            font-weight: bold; 
            color: #007bff;
            border-top: 2px solid #007bff;
            padding-top: 10px;
            margin-top: 10px;
          }
          .notes { 
            margin-top: 30px; 
            padding: 15px;
            background: #fff3cd;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .document-header { border-color: #000; }
            .items-table th { background: #000; }
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <div class="document-title">${document.document_type.replace('_', ' ')}</div>
          <div class="document-number">${document.document_number}</div>
          <div class="document-date">Generated: ${new Date(document.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</div>
        </div>

        <div class="info-grid">
          ${businessInfo.name ? `
            <div class="info-box">
              <div class="section-title">Business Information</div>
              <div><strong>Name:</strong> ${businessInfo.name}</div>
              ${businessInfo.address ? `<div><strong>Address:</strong> ${businessInfo.address}</div>` : ''}
              ${businessInfo.phone ? `<div><strong>Phone:</strong> ${businessInfo.phone}</div>` : ''}
              ${businessInfo.email ? `<div><strong>Email:</strong> ${businessInfo.email}</div>` : ''}
            </div>
          ` : ''}
          
          <div class="info-box">
            <div class="section-title">Customer Information</div>
            <div><strong>Name:</strong> ${normalizedCustomer.name || 'N/A'}</div>
            ${normalizedCustomer.phone ? `<div><strong>Phone:</strong> ${normalizedCustomer.phone}</div>` : ''}
            ${normalizedCustomer.email ? `<div><strong>Email:</strong> ${normalizedCustomer.email}</div>` : ''}
            ${normalizedCustomer.address ? `<div><strong>Address:</strong> ${normalizedCustomer.address}</div>` : ''}
          </div>
        </div>

        ${isReversalReceipt && content.notes ? `
          <div class="notes">
            <div class="section-title">Reversal Reason</div>
            <p>${content.notes}</p>
          </div>
        ` : ''}

        ${normalizedItems.length > 0 ? `
          <div class="section">
            <div class="section-title">${isReversalReceipt ? 'Reversed Items' : 'Items'}</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${normalizedItems.map((item: any) => `
                  <tr>
                    <td>${item.name || item.description || 'Item'}</td>
                    <td style="text-align: center;">${item.quantity || 1}</td>
                    <td style="text-align: right;">¢${(item.unitPrice || 0).toFixed(2)}</td>
                    <td style="text-align: right;">¢${(item.total || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="totals-section">
          <div class="total-row">Subtotal: ¢${(normalizedTotals.subtotal || 0).toFixed(2)}</div>
          ${normalizedTotals.taxAmount ? `<div class="total-row">Tax (${normalizedTotals.taxRate || 0}%): ¢${normalizedTotals.taxAmount.toFixed(2)}</div>` : ''}
          ${normalizedTotals.discount ? `<div class="total-row">Discount: -¢${normalizedTotals.discount.toFixed(2)}</div>` : ''}
          <div class="total-final">${isReversalReceipt ? 'Reversed Amount' : 'Total'}: ¢${(normalizedTotals.total || document.total_amount || 0).toFixed(2)}</div>
        </div>

        ${!isReversalReceipt && content.notes ? `
          <div class="notes">
            <div class="section-title">Notes</div>
            <p>${content.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>This document was generated electronically and is valid without signature.</p>
          <p>Document ID: ${document.id}</p>
        </div>
      </body>
      </html>
    `;
  };

  const downloadAsHTML = (filename: string, htmlContent: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Document Downloaded",
      description: `${filename}.html has been downloaded to your device.`,
    });
  };

  const handleDownloadDocument = async (docId: string) => {
    try {
      console.log('Attempting to download document:', docId);

      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

      if (error) {
        console.error('Error fetching document for download:', error);
        throw error;
      }

      // Try to use edge function for branded documents
      const edgeFunctionMap: { [key: string]: string } = {
        'invoice': 'generate-invoice',
        'receipt': 'generate-receipt',
        'waybill': 'generate-waybill',
        'proforma_invoice': 'generate-proforma-invoice'
      };

      const edgeFunctionName = edgeFunctionMap[document.document_type];

      if (edgeFunctionName && user) {
        // Fetch business profile for branded documents
        const { data: businessProfile, error: profileError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!profileError && businessProfile) {
          const content = typeof document.content === 'string'
            ? JSON.parse(document.content)
            : document.content;

          let edgeFunctionData: any;

          if (document.document_type === 'invoice') {
            edgeFunctionData = {
              businessProfile,
              document: {
                documentNumber: document.document_number,
                date: document.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                dueDate: content?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                customerName: document.customer_name || 'Customer',
                customerAddress: content?.customer?.address || '',
                customerPhone: content?.customer?.phone || 'N/A',
                items: (content?.items || []).map((item: any) => ({
                  description: item.productName || item.description || 'Item',
                  quantity: item.quantity || 1,
                  unitPrice: item.unitPrice || 0,
                  discount: item.discount || 0,
                  total: item.total || 0
                })),
                subtotal: content?.subtotal || 0,
                overallDiscount: 0,
                tax: content?.totalTax || 0,
                total: document.total_amount || 0,
                paymentTerms: content?.paymentTerms || 'Payment due upon receipt',
                notes: content?.notes || '',
                includeVAT: content?.applyTaxes || false
              }
            };
          } else if (document.document_type === 'receipt') {
            edgeFunctionData = {
              businessProfile,
              items: (content?.items || []).map((item: any) => ({
                productName: item.productName || 'Item',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                total: item.total || 0,
                unitOfMeasure: item.unitOfMeasure || 'units'
              })),
              customer: {
                name: document.customer_name || 'Customer',
                phone: content?.customer?.phone || 'N/A'
              },
              subtotal: content?.subtotal || 0,
              totalTax: content?.totalTax || 0,
              total: document.total_amount || 0,
              paymentMethod: content?.paymentMethod || 'cash',
              paymentStatus: content?.paymentStatus || 'paid_in_full',
              partialPayment: content?.partialPayment || null,
              applyTaxes: content?.applyTaxes || false,
              notes: content?.notes || '',
              date: document.created_at || new Date().toISOString()
            };
          }

          if (edgeFunctionData) {
            const { data: html, error: funcError } = await supabase.functions.invoke(edgeFunctionName, {
              body: edgeFunctionData
            });

            if (!funcError && html) {
              const htmlContent = typeof html === 'string' ? html : JSON.stringify(html);
              const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.style.display = 'none';
              link.href = url;
              link.download = `${document.document_type}_${document.document_number}.html`;
              document.body.appendChild(link);
              link.click();

              setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              }, 100);

              toast({
                title: "Success",
                description: "Document downloaded successfully"
              });
              return;
            }
          }
        }
      }

      // Fall back to simple HTML generation
      if (document?.content) {
        const content = typeof document.content === 'string'
          ? JSON.parse(document.content)
          : document.content;

        const htmlContent = createDocumentHTML(document, content);
        downloadAsHTML(document.document_number, htmlContent);
      } else {
        toast({
          title: "Download Failed",
          description: `${document.document_number} - No content available to download`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading recent documents...</div>;
  }

  if (recentDocs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No issued documents yet</p>
        <p className="text-sm">Generated documents will appear here once issued</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentDocs.map((doc) => {
        const Icon = doc.icon;
        return (
          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${doc.color} text-white`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-sm">{doc.number}</div>
                <div className="text-xs text-muted-foreground">
                  {doc.customer} • ¢{doc.amount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDocument(doc.id)}
                title="View Document"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadDocument(doc.id)}
                title="Download Document"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DocumentsSection = () => {
  const [activeView, setActiveView] = useState<"overview" | "create" | "history" | "external-receipts" | "proforma-invoices" | "business-notes" | "reversal-receipts">("overview");
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const { toast } = useToast();
  const { generateFinancialStatement, generateSalesReport } = useReportsDownload();

  const documentTypes = [
    {
      id: "receipt",
      name: "Receipt",
      icon: Receipt,
      description: "Generate customer receipts",
      color: "bg-green-500"
    },
    {
      id: "invoice",
      name: "Invoice",
      icon: FileText,
      description: "Create invoices for customers",
      color: "bg-blue-500"
    },
    {
      id: "proforma_invoice",
      name: "Proforma Invoice",
      icon: FileText,
      description: "Create quotation/estimate invoices",
      color: "bg-red-500"
    },
    {
      id: "waybill",
      name: "Waybill",
      icon: Truck,
      description: "Transport documentation",
      color: "bg-orange-500"
    },
    {
      id: "purchase_order",
      name: "Purchase Order",
      icon: FileSpreadsheet,
      description: "Orders for suppliers",
      color: "bg-purple-500"
    }
  ];

  const handleDocumentTypeSelect = (docType: string) => {
    setSelectedDocType(docType);
    setActiveView("create");
  };

  const handleGenerateFinancialStatement = () => {
    generateFinancialStatement('month');
  };

  const handleGenerateSalesReport = () => {
    generateSalesReport('month');
  };

  if (activeView === "create") {
    return (
      <DocumentCreator
        documentType={selectedDocType}
        onBack={() => setActiveView("overview")}
        onSuccess={() => {
          setActiveView("history");
          toast({
            title: "Document Created",
            description: "Your document has been created successfully.",
          });
        }}
      />
    );
  }

  if (activeView === "external-receipts") {
    return (
      <ExternalReceiptsManager
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "proforma-invoices") {
    return (
      <ProformaInvoiceManager
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "history") {
    return (
      <DocumentHistory
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "business-notes") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setActiveView("overview")}
          className="flex items-center gap-2 mb-4"
        >
          <FileText className="w-4 h-4" />
          ← Back to Documents
        </Button>
        <BusinessNotes />
      </div>
    );
  }

  if (activeView === "reversal-receipts") {
    return (
      <ReversalReceiptsHistory
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "past-sales") {
    return (
      <PastSalesRecording
        onBack={() => setActiveView("overview")}
      />
    );
  }

  if (activeView === "bulk-upload") {
    return (
      <BulkSalesUpload
        onBack={() => setActiveView("overview")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Creation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Documents
          </CardTitle>
          <CardDescription>
            Generate professional business documents based on West African trading standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {documentTypes.map((docType) => {
              const Icon = docType.icon;
              return (
                <Button
                  key={docType.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-3 hover:bg-muted/50"
                  onClick={() => handleDocumentTypeSelect(docType.id)}
                >
                  <div className={`p-3 rounded-full ${docType.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-sm">{docType.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {docType.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reports Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Generate Reports
          </CardTitle>
          <CardDescription>
            Download comprehensive financial and sales reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex items-center justify-between"
              onClick={handleGenerateFinancialStatement}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500 text-white">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Financial Statement</div>
                  <div className="text-sm text-muted-foreground">
                    Comprehensive financial overview
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex items-center justify-between"
              onClick={handleGenerateSalesReport}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-indigo-500 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Sales Summary Report</div>
                  <div className="text-sm text-muted-foreground">
                    Detailed sales performance analysis
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sales Data Management
          </CardTitle>
          <CardDescription>
            Record past sales and import historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex items-center justify-between"
              onClick={() => setActiveView("past-sales")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500 text-white">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Record Past Sales</div>
                  <div className="text-sm text-muted-foreground">
                    Add sales from previous dates
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex items-center justify-between"
              onClick={() => setActiveView("bulk-upload")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500 text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Bulk Upload (CSV)</div>
                  <div className="text-sm text-muted-foreground">
                    Import multiple past sales at once
                  </div>
                </div>
              </div>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ⚠️ Past sales will be timestamped with both the sale date and the recording date for accurate tracking.
          </p>
        </CardContent>
      </Card>

      {/* External Receipts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            External Receipts Tracker
          </CardTitle>
          <CardDescription>
            Record and track receipts from external purchases and business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Keep track of business expenses, supplier receipts, and external purchases.
              All tracked receipts contribute to your trust score and financial records.
            </p>
            <Button
              onClick={() => setActiveView("external-receipts")}
              className="w-full md:w-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage External Receipts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Proforma Invoice Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Proforma Invoices
          </CardTitle>
          <CardDescription>
            Create and manage proforma invoices for your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create professional price quotes with itemized details, terms, and conditions.
            </p>
            <Button
              onClick={() => setActiveView("proforma-invoices")}
              className="w-full md:w-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Proforma Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reversal Receipts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="w-5 h-5" />
            Reversed Sales Receipts
          </CardTitle>
          <CardDescription>
            Review receipts generated when sales are reversed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Every sale reversal generates a dedicated receipt for your records. Access them here for quick reference and downloads.
            </p>
            <Button
              onClick={() => setActiveView("reversal-receipts")}
              className="w-full md:w-auto flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              View Reversal Receipts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Notes
          </CardTitle>
          <CardDescription>
            Write and save important business notes and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Keep track of important business information, meeting notes, supplier contacts, and more.
              Search and access your notes anytime.
            </p>
            <Button
              onClick={() => setActiveView("business-notes")}
              className="w-full md:w-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage Business Notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document History Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Documents
              </CardTitle>
              <CardDescription>
                Your latest generated documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveView("history")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentDocumentsList />
          <div className="text-center py-4">
            <Button variant="link" onClick={() => setActiveView("history")}>
              View all documents →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsSection;