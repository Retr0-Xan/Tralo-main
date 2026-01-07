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

      // For now, just show a basic template since ProformaInvoiceManager
      // needs to be updated to use the edge functions properly
      // This is a temporary fallback
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${documentData.documentType} - ${documentData.documentNumber}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; }
            .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #dc2626; font-size: 32px; margin-bottom: 10px; }
            .header h2 { color: #666; font-size: 18px; }
            .content { margin: 30px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .info-label { font-weight: 600; color: #555; }
            .info-value { color: #333; }
            .total-section { margin-top: 40px; padding: 20px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; }
            .total { font-size: 24px; font-weight: bold; text-align: center; color: #dc2626; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 14px; }
            .note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${documentData.documentType.toUpperCase()}</h1>
            <h2>${documentData.documentNumber}</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="info-label">Customer:</span>
              <span class="info-value">${documentData.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div class="note">
            <strong>📝 Note:</strong> This is a simplified document view. For full branded documents with QR codes, 
            please create documents through the Documents → Create Document menu.
          </div>
          <div class="total-section">
            <div class="total">Total Amount: GH¢${documentData.totalAmount.toLocaleString()}</div>
          </div>
          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = `${documentData.documentType.replace(/\s+/g, '_')}_${documentData.documentNumber}_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

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
