import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface DocumentData {
  documentType: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string;
}

export const useDocumentGeneration = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateDocumentNumber = (type: string) => {
    const timestamp = Date.now().toString().slice(-6);
    const prefixes = {
      receipt: 'REC',
      invoice: 'INV',
      waybill: 'WB',
      purchase_order: 'PO'
    };
    const prefix = prefixes[type as keyof typeof prefixes] || 'DOC';
    return `${prefix}-${timestamp}`;
  };

  const createDocument = async (documentData: DocumentData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create documents",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    
    try {
      const documentNumber = generateDocumentNumber(documentData.documentType);
      
      // Fetch business profile for complete document information
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Create the document content with business information
      const content = {
        business: {
          name: businessProfile?.business_name || 'Business Name',
          address: businessProfile?.business_address || '',
          phone: businessProfile?.phone_number || '',
          email: businessProfile?.email || user.email,
          registrationNumber: businessProfile?.registration_number || '',
          slogan: businessProfile?.slogan || ''
        },
        customer: {
          name: documentData.customerName,
          phone: documentData.customerPhone,
          email: documentData.customerEmail,
          address: documentData.customerAddress
        },
        items: documentData.items,
        totals: {
          subtotal: documentData.subtotal,
          taxRate: documentData.taxRate || 0,
          taxAmount: documentData.taxAmount || 0,
          total: documentData.totalAmount
        },
        notes: documentData.notes,
        generatedAt: new Date().toISOString()
      };

      // Save to documents table
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: documentData.documentType,
          document_number: documentNumber,
          title: `${documentData.documentType.charAt(0).toUpperCase() + documentData.documentType.slice(1)} - ${documentData.customerName}`,
          customer_name: documentData.customerName,
          total_amount: documentData.totalAmount,
          content: content,
          status: 'issued' // Automatically mark as issued
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Document Created",
        description: `${documentNumber} has been generated and saved successfully.`,
      });

      return data;

    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to create document. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptFromSale = async (saleData: {
    customerPhone: string;
    productName: string;
    amount: number;
    paymentMethod?: string;
  }) => {
    const documentData: DocumentData = {
      documentType: 'receipt',
      customerName: saleData.customerPhone,
      customerPhone: saleData.customerPhone,
      items: [{
        name: saleData.productName,
        quantity: 1,
        unitPrice: saleData.amount,
        total: saleData.amount
      }],
      subtotal: saleData.amount,
      totalAmount: saleData.amount,
      notes: saleData.paymentMethod ? `Payment Method: ${saleData.paymentMethod}` : undefined
    };

    return await createDocument(documentData);
  };

  return {
    createDocument,
    generateReceiptFromSale,
    loading
  };
};