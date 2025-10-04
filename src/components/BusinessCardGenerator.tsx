import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Phone, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';
import { shareViaWhatsApp, formatBusinessMessage } from "@/lib/whatsapp";

interface BusinessCardGeneratorProps {
  businessName: string;
  location: string;
  products: string[];
  phoneNumber: string;
  whatsAppNumber?: string;
}

const BusinessCardGenerator: React.FC<BusinessCardGeneratorProps> = ({
  businessName,
  location,
  products,
  phoneNumber,
  whatsAppNumber
}) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const generateBusinessCard = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: 400,
        height: 240
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${businessName.replace(/\s+/g, '_')}_business_card.png`;
          link.click();
          URL.revokeObjectURL(url);

          toast({
            title: "Business Card Generated",
            description: "Your business card has been downloaded successfully.",
          });
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating business card:', error);
      toast({
        title: "Error",
        description: "Failed to generate business card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareBusinessCard = async () => {
    const cardText = `${businessName}\n${location}\n\n${products.slice(0, 3).join(' • ')}\n\n📞 ${phoneNumber}\n💬 ${whatsAppNumber || phoneNumber}\n\n✅ Tralo Verified`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} - Business Card`,
          text: cardText,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(cardText);
        toast({
          title: "Business Card Copied",
          description: "Business card details copied to clipboard.",
        });
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(cardText);
      toast({
        title: "Business Card Copied",
        description: "Business card details copied to clipboard.",
      });
    }
  };

  const shareViaWhatsAppNew = async () => {
    const message = formatBusinessMessage({
      businessName,
      location,
      products,
      phoneNumber,
      customMessage: `WhatsApp: ${whatsAppNumber || phoneNumber}`
    });

    const success = await shareViaWhatsApp({
      message,
      maxLength: 800,
      useWebVersion: true,
      delay: 200
    });

    if (!success) {
      toast({
        title: "WhatsApp Share",
        description: "If WhatsApp didn't open, the message has been copied to your clipboard.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Business Card Preview */}
      <div 
        ref={cardRef}
        className="w-[400px] h-[240px] bg-white border-2 border-gray-200 rounded-lg shadow-lg p-6 mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black mb-2">{businessName}</h1>
            <p className="text-gray-600 mb-4">{location}</p>
            <p className="text-black font-medium">{products.slice(0, 3).join(' • ')}</p>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-black">
                <Phone className="w-4 h-4" />
                <span>{phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-black">
                <MessageCircle className="w-4 h-4" />
                <span>{whatsAppNumber || phoneNumber}</span>
              </div>
            </div>
            
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <span className="text-green-600 mr-1">✓</span>
              Tralo Verified
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center">
        <Button onClick={generateBusinessCard} variant="default" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download Card
        </Button>
        <Button onClick={shareViaWhatsAppNew} variant="outline" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          <Share2 className="w-4 h-4 mr-2" />
          Share WhatsApp
        </Button>
        <Button onClick={shareBusinessCard} variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share More
        </Button>
      </div>
    </div>
  );
};

export default BusinessCardGenerator;