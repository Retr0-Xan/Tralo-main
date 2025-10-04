import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import TraloLogo from "@/components/TraloLogo";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const ConfirmEmail = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Handle both hash and search parameters as Supabase can use either
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      
      const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
      const type = hashParams.get('type') || urlParams.get('type');
      const errorParam = hashParams.get('error') || urlParams.get('error');

      // Handle errors
      if (errorParam) {
        let errorMessage = "There was an error confirming your email.";
        if (errorParam === 'access_denied') {
          errorMessage = "The confirmation link has expired or been used already.";
        }
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (type === 'signup' && accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Email confirmation error:', error);
            setError("The confirmation link has expired or is invalid. Please sign up again.");
          } else {
            setIsConfirmed(true);
            toast({
              title: "Email Confirmed!",
              description: "Your email has been successfully confirmed. Welcome to Tralo!",
            });
            
            // Sign out the user so they can sign in properly
            await supabase.auth.signOut();
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, "/confirm-email");
          }
        } catch (error) {
          console.error('Session error:', error);
          setError("There was an error processing your confirmation. Please try again.");
        }
      } else if (!type && !accessToken) {
        setError("Invalid confirmation link. Please check your email for the correct link.");
      } else if (type === 'signup' && (!accessToken || !refreshToken)) {
        setError("The confirmation link is incomplete. Please check your email for a new link.");
      }
      
      setIsLoading(false);
    };

    handleEmailConfirmation();
  }, [toast]);

  const handleGoToLogin = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-primary rounded-lg px-4 py-2">
              <TraloLogo />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                Confirming Email
              </>
            ) : isConfirmed ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                Email Confirmed!
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-destructive" />
                Confirmation Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isLoading 
              ? "Please wait while we confirm your email address..."
              : isConfirmed 
                ? "Your account has been successfully activated"
                : "There was an issue with your email confirmation"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {isLoading ? (
            <div className="py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : isConfirmed ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  🎉 Welcome to Tralo! Your email has been verified and your account is now active.
                </p>
              </div>
              <p className="text-muted-foreground">
                You can now sign in to your account and start managing your business with Tralo.
              </p>
              <Button onClick={handleGoToLogin} className="w-full">
                Go to Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">
                  {error || "The confirmation link is invalid or has expired."}
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                If you're having trouble, please check your email for a new confirmation link or contact support.
              </p>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;