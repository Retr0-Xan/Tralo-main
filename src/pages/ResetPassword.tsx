import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import TraloLogo from "@/components/TraloLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, { message: "Password must be less than 100 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Handle both hash and search parameters as Supabase can use either
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);
      
      // Get tokens from either hash or search params
      const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
      const type = hashParams.get('type') || urlParams.get('type');
      const errorParam = hashParams.get('error') || urlParams.get('error');
      
      // Handle errors first
      if (errorParam) {
        let errorMessage = "There was an error with your reset link.";
        if (errorParam === 'access_denied') {
          errorMessage = "The reset link has expired or been used already. Please request a new one.";
        }
        toast({
          title: "Reset Link Error",
          description: errorMessage,
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      
      // Handle the password recovery callback
      if (type === 'recovery') {
        if (accessToken && refreshToken) {
          try {
            // Set the session with the tokens from the email link
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              console.error('Session error:', error);
              toast({
                title: "Session Error",
                description: "The reset link has expired. Please request a new password reset.",
                variant: "destructive",
              });
              navigate("/auth");
              return;
            }
            
            // Check if we have a pending password from the forgot password flow
            const pendingPassword = sessionStorage.getItem('pendingPassword');
            const pendingEmail = sessionStorage.getItem('pendingEmail');
            
            if (pendingPassword && pendingEmail) {
              // Update the user's password
              const { error: updateError } = await supabase.auth.updateUser({
                password: pendingPassword
              });
              
              if (updateError) {
                toast({
                  title: "Password Update Failed",
                  description: updateError.message,
                  variant: "destructive",
                });
              } else {
                // Clean up stored password
                sessionStorage.removeItem('pendingPassword');
                sessionStorage.removeItem('pendingEmail');
                
                toast({
                  title: "Password Updated Successfully! 🎉",
                  description: "Your password has been changed. You can now sign in with your new password.",
                });
                
                // Sign out and redirect to login
                await supabase.auth.signOut();
                setTimeout(() => {
                  navigate("/auth");
                }, 2000);
                return;
              }
            }
            
            // Clear both hash and search parameters
            window.history.replaceState({}, document.title, "/reset-password");
            
            toast({
              title: "Ready to Reset",
              description: "You can now set your new password.",
            });
            
          } catch (error) {
            console.error('Auth error:', error);
            toast({
              title: "Authentication Error",
              description: "There was an error processing your reset link. Please request a new one.",
              variant: "destructive",
            });
            navigate("/auth");
          }
        } else {
          toast({
            title: "Invalid Reset Link",
            description: "This password reset link is missing required information. Please request a new one.",
            variant: "destructive",
          });
          navigate("/auth");
        }
      } else if (!type && !accessToken) {
        // Direct access to reset-password without proper auth flow
        toast({
          title: "Access Denied",
          description: "Please use the password reset link from your email to access this page.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    try {
      // Validate input
      const validatedData = resetPasswordSchema.parse(formData);

      const { error } = await supabase.auth.updateUser({
        password: validatedData.password
      });

      if (error) {
        toast({
          title: "Password Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Updated Successfully! 🎉",
        description: "Your password has been changed. You can now sign in with your new password.",
      });
      
      // Clear the form
      setFormData({ password: "", confirmPassword: "" });
      
      // Sign out the user so they can sign in with the new password
      await supabase.auth.signOut();
      
      // Show success state briefly before redirecting
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg px-4 py-2">
              <TraloLogo />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              🔐 Create a new secure password for your Tralo account. After updating, you'll need to sign in again.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm text-center">
              ✅ After updating your password, you'll be redirected to sign in with your new credentials.
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;