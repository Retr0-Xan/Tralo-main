import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Copy, Share2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import QRCodeLib from 'qrcode';

const QRCodeDisplay: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQRCodeData = async () => {
      if (!user) return;

      try {
        const { data: businessProfile, error } = await supabase
          .from('business_profiles')
          .select('id, qr_code_data, business_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching QR code data:', error);
        }

        if (businessProfile) {
          const qrData = businessProfile.qr_code_data || '';
          setQrCodeData(qrData);
          setBusinessName(businessProfile.business_name || '');
          
          // Generate the actual QR code image
          if (qrData) {
            const qrImage = await generateQRCodeSVG(qrData, 200);
            setQrCodeImage(qrImage);
          }
        }
      } catch (error) {
        console.error('Error fetching QR code data:', error);
        toast({
          title: "Error",
          description: "Failed to load QR code data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQRCodeData();
  }, [user, toast]);

  const generateQRCodeSVG = async (data: string, size: number = 200) => {
    try {
      // Use the actual QR code library to generate a real QR code
      const qrCodeDataURL = await QRCodeLib.toDataURL(data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to simple placeholder
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <rect x="20" y="20" width="20" height="20" fill="black"/>
          <rect x="60" y="20" width="20" height="20" fill="black"/>
          <rect x="100" y="20" width="20" height="20" fill="black"/>
          <rect x="140" y="20" width="20" height="20" fill="black"/>
          <rect x="20" y="60" width="20" height="20" fill="black"/>
          <rect x="100" y="60" width="20" height="20" fill="black"/>
          <rect x="180" y="60" width="20" height="20" fill="black"/>
          <rect x="20" y="100" width="20" height="20" fill="black"/>
          <rect x="60" y="100" width="20" height="20" fill="black"/>
          <rect x="140" y="100" width="20" height="20" fill="black"/>
          <rect x="180" y="100" width="20" height="20" fill="black"/>
          <rect x="20" y="140" width="20" height="20" fill="black"/>
          <rect x="100" y="140" width="20" height="20" fill="black"/>
          <rect x="140" y="140" width="20" height="20" fill="black"/>
          <rect x="20" y="180" width="20" height="20" fill="black"/>
          <rect x="60" y="180" width="20" height="20" fill="black"/>
          <rect x="100" y="180" width="20" height="20" fill="black"/>
          <rect x="180" y="180" width="20" height="20" fill="black"/>
          <text x="100" y="195" text-anchor="middle" font-size="8" fill="black">Tralo</text>
        </svg>
      `)}`;
    }
  };

  const copyQRCode = async () => {
    if (!qrCodeData) return;
    
    await navigator.clipboard.writeText(qrCodeData);
    toast({
      title: "QR Code Copied",
      description: "QR code link copied to clipboard",
    });
  };

  const shareQRCode = async () => {
    if (!qrCodeData) return;

    const shareText = `Visit ${businessName} and make purchases easily! Scan this QR code or visit: ${qrCodeData}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} - Customer Purchases`,
          text: shareText,
          url: qrCodeData,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "QR Code Info Copied",
        description: "QR code information copied to clipboard",
      });
    }
  };

  const downloadQRCode = async () => {
    if (!qrCodeImage) return;
    
    try {
      // Convert the QR code to PNG for download
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 400;
        canvas.height = 400;
        ctx?.drawImage(img, 0, 0, 400, 400);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${businessName.replace(/\s+/g, '_')}_QR_Code.png`;
            link.click();
            URL.revokeObjectURL(url);
            
            toast({
              title: "QR Code Downloaded",
              description: "QR code saved as PNG file",
            });
          }
        }, 'image/png');
      };
      
      img.src = qrCodeImage;
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download QR code",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">
            <div className="w-48 h-48 bg-muted mx-auto mb-4 rounded"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!qrCodeData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">QR code not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-center">
          <QrCode className="w-5 h-5" />
          Customer Purchase QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {/* QR Code Display */}
        <div className="flex justify-center">
          {qrCodeImage ? (
            <div className="border-2 border-border rounded-lg p-4 bg-white">
              <img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className="border-2 border-border rounded-lg p-4 bg-white w-48 h-48 flex items-center justify-center">
              <span className="text-muted-foreground">Loading QR Code...</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Badge variant="secondary" className="text-green-600 border-green-300 bg-green-50">
            <span className="mr-1">✓</span>
            Active & Ready
          </Badge>
          <p className="text-sm text-muted-foreground">
            Customers can scan this code to access your purchase page and buy products directly
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          <Button onClick={copyQRCode} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={shareQRCode} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={downloadQRCode} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          <p>QR Code URL: {qrCodeData}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;