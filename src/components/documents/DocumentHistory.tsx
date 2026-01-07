import { useState, useEffect } from "react";
import { ArrowLeft, Search, Filter, Download, Edit2, Trash2, Share2, MessageSquare, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentShare } from "@/hooks/useDocumentShare";

interface DocumentHistoryProps {
  onBack: () => void;
}

interface Document {
  id: string;
  document_type: string;
  document_number: string;
  title: string;
  status: string;
  total_amount: number;
  customer_name: string;
  created_at: string;
}

const DocumentHistory = ({ onBack }: DocumentHistoryProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const { downloadDocument, shareViaWhatsApp, shareViaEmail, shareViaSMS } = useDocumentShare();

  useEffect(() => {
    fetchDocuments();

    // Listen for sales data updates to refresh documents
    const handleSalesUpdate = () => {
      console.log('Sales data updated, refreshing document history...');
      fetchDocuments();
    };

    window.addEventListener('sales-data-updated', handleSalesUpdate);

    return () => {
      window.removeEventListener('sales-data-updated', handleSalesUpdate);
    };
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, selectedType, selectedStatus]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(doc => doc.document_type === selectedType);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(doc => doc.status === selectedStatus);
    }

    setFilteredDocuments(filtered);
  };

  const getDocumentTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      receipt: "Receipt",
      invoice: "Invoice",
      waybill: "Waybill",
      purchase_order: "Purchase Order",
      reversal_receipt: "Reversal Receipt",
      financial_statement: "Financial Statement",
      sales_report: "Sales Report"
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'issued':
        return 'default';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // For invoices and other document types that have edge functions, regenerate from edge function
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

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Fall back to simple download
          downloadDocument({
            documentNumber: document.document_number,
            documentType: getDocumentTypeName(document.document_type),
            customerName: document.customer_name || "N/A",
            totalAmount: document.total_amount || 0
          });
          return;
        }

        // Parse document content to get the data
        const content = document.content as any;

        // Prepare data based on document type
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
        } else {
          // For other types, use simplified download
          downloadDocument({
            documentNumber: document.document_number,
            documentType: getDocumentTypeName(document.document_type),
            customerName: document.customer_name || "N/A",
            totalAmount: document.total_amount || 0
          });
          return;
        }

        // Call edge function
        const { data: html, error } = await supabase.functions.invoke(edgeFunctionName, {
          body: edgeFunctionData
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        // Download the generated document
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
      } else {
        // Fall back to simple download for document types without edge functions
        downloadDocument({
          documentNumber: document.document_number,
          documentType: getDocumentTypeName(document.document_type),
          customerName: document.customer_name || "N/A",
          totalAmount: document.total_amount || 0
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document. Using simplified version.",
        variant: "destructive"
      });
      // Fall back to simple download
      downloadDocument({
        documentNumber: document.document_number,
        documentType: getDocumentTypeName(document.document_type),
        customerName: document.customer_name || "N/A",
        totalAmount: document.total_amount || 0
      });
    }
  };

  const handleView = (document: Document) => {
    toast({
      title: "Opening Document",
      description: `Opening ${document.document_number} for preview.`,
    });
    // Here you would implement the document preview
  };

  const handleEdit = (document: Document) => {
    toast({
      title: "Edit Document",
      description: `Opening ${document.document_number} for editing.`,
    });
    // Here you would implement the edit functionality
  };

  const handleDelete = async (document: Document) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      toast({
        title: "Document Deleted",
        description: `${document.document_number} has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Document History</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">Loading documents...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Document History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            Search and filter through your generated documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by document number, customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="waybill">Waybills</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="reversal_receipt">Reversal Receipts</SelectItem>
                  <SelectItem value="financial_statement">Financial Statements</SelectItem>
                  <SelectItem value="sales_report">Sales Reports</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No documents found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {document.document_number}
                      </TableCell>
                      <TableCell>
                        {getDocumentTypeName(document.document_type)}
                      </TableCell>
                      <TableCell>{document.customer_name}</TableCell>
                      <TableCell>¢{document.total_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(document.status) as any}>
                          {document.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(document.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" title="Share">
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => shareViaWhatsApp({
                                documentNumber: document.document_number,
                                documentType: getDocumentTypeName(document.document_type),
                                customerName: document.customer_name || "N/A",
                                totalAmount: document.total_amount || 0
                              })}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                WhatsApp
                              </DropdownMenuItem>
                              {document.customer_name && (
                                <DropdownMenuItem onClick={() => shareViaEmail({
                                  documentNumber: document.document_number,
                                  documentType: getDocumentTypeName(document.document_type),
                                  customerName: document.customer_name,
                                  totalAmount: document.total_amount || 0
                                }, '')}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Email
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {document.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(document)}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(document)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentHistory;