import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Share2, MessageCircle, Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { shareViaWhatsApp, formatPriceListMessage } from "@/lib/whatsapp";

interface ShareItem {
  name: string;
  price: string;
  unit?: string;
}

interface ShareMessageGeneratorProps {
  businessName: string;
  location: string;
  phoneNumber: string;
  items: ShareItem[];
  type: 'sales' | 'inventory';
}

const ShareMessageGenerator: React.FC<ShareMessageGeneratorProps> = ({
  businessName,
  location,
  phoneNumber,
  items,
  type
}) => {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState('');

  const generateMessage = () => {
    const title = type === 'sales' ? "Today's Prices" : "Available Items";
    const itemsList = items.slice(0, 10).map(item => 
      `${item.name}${item.unit ? ` - ¢${item.price}/${item.unit}` : ` - ¢${item.price}`}`
    ).join('\n');
    
    const message = `${title} - ${businessName} (via Tralo)

${itemsList}${items.length > 10 ? '\n...and more items available!' : ''}

📍 ${location}

📞 ${phoneNumber} | WhatsApp available

${customMessage ? `\n${customMessage}` : ''}`;

    return message;
  };

  const copyToClipboard = async () => {
    const message = generateMessage();
    await navigator.clipboard.writeText(message);
    
    toast({
      title: "Message Copied",
      description: "Message copied to clipboard. You can now paste it anywhere.",
    });
  };

  const shareViaWhatsAppNew = async () => {
    const message = formatPriceListMessage({
      businessName,
      location,
      phoneNumber,
      items: items.map(item => ({
        name: item.name,
        price: item.price,
        unit: item.unit
      })),
      customMessage,
      type
    });

    const success = await shareViaWhatsApp({
      message,
      maxLength: 1000,
      useWebVersion: true,
      delay: 150
    });

    if (!success) {
      toast({
        title: "WhatsApp Share",
        description: "If WhatsApp didn't open, the message has been copied to your clipboard.",
        variant: "default",
      });
    }
  };

  const shareViaSMS = () => {
    const message = generateMessage();
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `sms:?body=${encodedMessage}`;
    window.open(smsUrl, '_blank');
  };

  const shareNatively = async () => {
    const message = generateMessage();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} - ${type === 'sales' ? "Today's Prices" : 'Available Items'}`,
          text: message,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to copying
      await copyToClipboard();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Share {type === 'sales' ? 'Today\'s Prices' : 'Inventory'} Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Preview */}
        <div className="bg-muted p-4 rounded-lg border">
          <div className="text-sm font-mono whitespace-pre-line">
            {generateMessage()}
          </div>
        </div>

        {/* Custom Message Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Add custom message (optional):
          </label>
          <Textarea
            placeholder="e.g., Fresh stock arrived today! Call for delivery..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
          />
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={shareViaWhatsAppNew} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
          
          <Button onClick={shareViaSMS} variant="outline" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            SMS
          </Button>
          
          <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copy
          </Button>
          
          <Button onClick={shareNatively} variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            ✨ Powered by Tralo
          </Badge>
          <span>Professional message formatting included</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareMessageGenerator;