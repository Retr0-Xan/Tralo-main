import { useToast } from "./use-toast";
import { shareViaWhatsApp as shareToWhatsApp } from "@/lib/whatsapp";

interface ShareDocumentData {
  documentNumber: string;
  documentType: string;
  customerName: string;
  totalAmount: number;
  documentContent?: any;
}

export const useDocumentShare = () => {
  const { toast } = useToast();

  const downloadDocument = async (documentData: ShareDocumentData) => {
    try {
      toast({
        title: "Preparing Download",
        description: `Generating ${documentData.documentType} document...`,
      });

      // Create a simple HTML document for download
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${documentData.documentType} - ${documentData.documentNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .content { margin: 20px 0; }
            .footer { margin-top: 40px; text-align: center; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${documentData.documentType}</h1>
            <h2>${documentData.documentNumber}</h2>
          </div>
          <div class="content">
            <p><strong>Customer:</strong> ${documentData.customerName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            ${documentData.documentContent ? generateContentTable(documentData.documentContent) : ''}
            <div class="total">Total Amount: ¢${documentData.totalAmount.toLocaleString()}</div>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentData.documentType}_${documentData.documentNumber}_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "📄 Document Downloaded!",
        description: `${documentData.documentType} has been saved to your downloads.`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = (documentData: ShareDocumentData, phoneNumber?: string) => {
    const message = `${documentData.documentType} - ${documentData.documentNumber}\n\nCustomer: ${documentData.customerName}\nTotal Amount: ¢${documentData.totalAmount.toLocaleString()}\n\nThank you for your business!`;
    shareToWhatsApp({ message });
    
    toast({
      title: "Opening WhatsApp",
      description: "Redirecting to WhatsApp to share document...",
    });
  };

  const shareViaSMS = (documentData: ShareDocumentData, phoneNumber: string) => {
    const message = `${documentData.documentType} - ${documentData.documentNumber}\n\nCustomer: ${documentData.customerName}\nTotal Amount: ¢${documentData.totalAmount.toLocaleString()}\n\nThank you for your business!`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    
    toast({
      title: "Opening SMS",
      description: "Redirecting to SMS app...",
    });
  };

  const shareViaEmail = (documentData: ShareDocumentData, email: string) => {
    const subject = `${documentData.documentType} - ${documentData.documentNumber}`;
    const body = `Dear ${documentData.customerName},\n\nPlease find attached your ${documentData.documentType} details:\n\nDocument Number: ${documentData.documentNumber}\nTotal Amount: ¢${documentData.totalAmount.toLocaleString()}\n\nThank you for your business!\n\nBest regards`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    
    toast({
      title: "Opening Email",
      description: "Preparing email draft...",
    });
  };

  const shareSocial = (documentData: ShareDocumentData, platform: 'facebook' | 'twitter' | 'linkedin') => {
    const text = `${documentData.documentType} - ${documentData.documentNumber} for ${documentData.customerName}. Total: ¢${documentData.totalAmount.toLocaleString()}`;
    
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
        break;
    }
    
    window.open(url, '_blank', 'width=600,height=400');
    toast({
      title: "Sharing to Social Media",
      description: `Opening ${platform} share dialog...`,
    });
  };

  return {
    downloadDocument,
    shareViaWhatsApp,
    shareViaSMS,
    shareViaEmail,
    shareSocial
  };
};

// Helper function to generate content table HTML
function generateContentTable(content: any): string {
  if (!content || !content.items || !Array.isArray(content.items)) {
    return '';
  }
  
  return `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${content.items.map((item: any) => `
          <tr>
            <td>${item.item_name || item.description || 'Item'}</td>
            <td>${item.quantity || 1}</td>
            <td>¢${(item.unit_price || item.unitPrice || 0).toLocaleString()}</td>
            <td>¢${(item.total_price || item.total || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
