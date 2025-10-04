import { useState, useEffect } from "react";
import { QrCode, X, Sparkles, Copy, ExternalLink, Download, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import QRCodeLib from 'qrcode';

const QRCodeSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profileData, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching business profile:', error);
          return;
        }
        
        if (!profileData) {
          console.log('No business profile found');
          return;
        }

        setBusinessProfile(profileData);
        // Generate QR code URL if not exists
        let qrUrl = profileData.qr_code_data;
        if (!qrUrl) {
          qrUrl = `${window.location.origin}/purchase-multiple?business_id=${profileData.id}`;
          
          // Update the business profile with the QR code URL
          await supabase
            .from('business_profiles')
            .update({ qr_code_data: qrUrl })
            .eq('user_id', user.id);
        }
        
        setQrCodeUrl(qrUrl);
        
        // Generate QR code image
        try {
          const qrDataURL = await QRCodeLib.toDataURL(qrUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataURL(qrDataURL);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      } catch (error) {
        console.error('Error fetching business profile:', error);
      }
    };

    fetchBusinessProfile();
  }, [user]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCodeUrl);
    toast({
      title: "Copied!",
      description: "QR Code URL has been copied to clipboard.",
    });
  };

  const downloadQRCode = async () => {
    if (!qrCodeDataURL) {
      toast({
        title: "Error",
        description: "QR code not ready for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = `${businessProfile.business_name}_QR_Code.png`;
      link.href = qrCodeDataURL;
      link.click();
      
      toast({
        title: "QR Code Downloaded",
        description: "Your QR code has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code.",
        variant: "destructive",
      });
    }
  };

  if (!businessProfile) {
    return null; // Don't show anything while loading
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          View QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Customer Purchase QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="flex justify-center">
            {qrCodeDataURL ? (
              <img 
                src={qrCodeDataURL} 
                alt="QR Code for business purchase page"
                className="w-48 h-48 border border-border rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted">
                <div className="text-center">
                  <QrCode className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                  <p className="font-medium">{businessProfile.business_name}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* QR Code Info */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Customers can scan this code to access your purchase page
            </p>
            <div className="text-xs text-center text-muted-foreground bg-muted p-2 rounded font-mono break-all">
              {qrCodeUrl}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={downloadQRCode} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Test Buttons */}
          {/* Test Purchase Button */}
          <div className="flex justify-center">
            <Button 
              onClick={() => navigate('/purchase-multiple?business_id=' + businessProfile?.id)} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Test Purchase Page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeSection;