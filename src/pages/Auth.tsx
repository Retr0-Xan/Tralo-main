import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import TraloLogo from "@/components/TraloLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { z } from "zod";

// Validation schemas
const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, { message: "Password must be less than 100 characters" })
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, { message: "Password must be less than 100 characters" }),
  businessName: z.string().trim().min(1, { message: "Business name is required" }).max(100, { message: "Business name must be less than 100 characters" }),
  ownerName: z.string().trim().min(1, { message: "Owner name is required" }).max(100, { message: "Owner name must be less than 100 characters" }),
  phoneNumber: z.string().trim().min(10, { message: "Phone number must be at least 10 digits" }).max(20, { message: "Phone number must be less than 20 characters" }),
  businessAddress: z.string().trim().min(1, { message: "Business address is required" }).max(200, { message: "Business address must be less than 200 characters" }),
  city: z.string().trim().min(1, { message: "City is required" }).max(100, { message: "City must be less than 100 characters" }),
  country: z.string().trim().min(1, { message: "Country is required" }).max(100, { message: "Country must be less than 100 characters" }),
  businessType: z.string().min(1, { message: "Please select a business type" })
});

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    businessName: "",
    phoneNumber: "",
    businessAddress: "",
    city: "",
    country: "",
    businessType: "",
    ownerName: ""
  });

  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const africanCountries = [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
    "Congo", "Côte d'Ivoire", "Democratic Republic of the Congo", "Djibouti",
    "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia",
    "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya",
    "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali",
    "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
    "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal",
    "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan",
    "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
  ];

  const filteredCountries = africanCountries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Check if user is already logged in and handle OAuth callback
  useEffect(() => {
    const handleAuthState = async () => {
      // Check for email confirmation
      const urlParams = new URLSearchParams(window.location.search);
      const confirmed = urlParams.get('confirmed');

      if (confirmed === 'true') {
        toast({
          title: "Email Confirmed! ✅",
          description: "Your account has been activated. You can now sign in.",
        });
        // Clear the URL parameter
        window.history.replaceState({}, document.title, "/auth");
        return;
      }

      // Check if user is already logged in or just completed OAuth
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if this is a new OAuth user without business profile
        const { data: businessProfile, error } = await supabase
          .from('business_profiles')
          .select('business_name, owner_name, phone_number')
          .eq('user_id', session.user.id)
          .single();

        // If business profile doesn't exist or is incomplete, redirect to complete profile
        if (error || !businessProfile || !businessProfile.business_name || !businessProfile.owner_name || !businessProfile.phone_number) {
          toast({
            title: "Complete Your Profile",
            description: "Please provide your business information to get started.",
          });
          navigate("/complete-profile");
          return;
        }

        // Profile is complete, navigate to home
        toast({
          title: "Welcome! 👋",
          description: session.user.email?.includes('@')
            ? "You've successfully signed in with Google."
            : "You've successfully signed in.",
        });
        navigate("/");
      }
    };

    handleAuthState();

    // Listen for auth state changes (OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if business profile is complete
        const { data: businessProfile, error } = await supabase
          .from('business_profiles')
          .select('business_name, owner_name, phone_number')
          .eq('user_id', session.user.id)
          .single();

        // If business profile doesn't exist or is incomplete, redirect to complete profile
        if (error || !businessProfile || !businessProfile.business_name || !businessProfile.owner_name || !businessProfile.phone_number) {
          toast({
            title: "Complete Your Profile",
            description: "Please provide your business information to continue.",
          });
          navigate("/complete-profile");
          return;
        }

        toast({
          title: "Welcome! 👋",
          description: "You've successfully signed in.",
        });
        navigate("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate input
      const validatedData = signInSchema.parse({
        email: formData.email,
        password: formData.password
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Sign In Failed",
            description: "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign In Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Welcome Back!",
          description: "You have been successfully signed in.",
        });
        navigate("/");
      }
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate input
      const validatedData = signUpSchema.parse(formData);

      const redirectUrl = `${window.location.origin}/auth?confirmed=true`;

      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            business_name: validatedData.businessName,
            owner_name: validatedData.ownerName,
            phone_number: validatedData.phoneNumber,
            business_address: validatedData.businessAddress,
            location: `${validatedData.city}, ${validatedData.country}`,
            business_type: validatedData.businessType,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user && !data.session) {
        // User created but needs email confirmation
        toast({
          title: "Account Created! 📧",
          description: "Please check your email and click the confirmation link to activate your account.",
        });
      } else if (data.session) {
        // User is immediately signed in (email confirmation disabled)
        toast({
          title: "Account Created Successfully! 🎉",
          description: "Welcome to Tralo! You can now start managing your business.",
        });
        navigate("/");
      }
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Google sign in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="-mt-12 flex justify-center">
            <TraloLogo className="h-[5.7rem] w-auto" />
          </div>
          <p className="text-muted-foreground text-sm mb-4 mt-0">
            Proof today, the future of trade tomorrow
          </p>
          <CardTitle>{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Set up your business profile to get started"
              : "Sign in to your trading account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>



          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Your Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="Enter your full name"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange("ownerName", e.target.value)}
                    className={errors.ownerName ? "border-destructive" : ""}
                    required
                  />
                  {errors.ownerName && (
                    <p className="text-sm text-destructive">{errors.ownerName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    className={errors.businessName ? "border-destructive" : ""}
                    required
                  />
                  {errors.businessName && (
                    <p className="text-sm text-destructive">{errors.businessName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    className={errors.phoneNumber ? "border-destructive" : ""}
                    required
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    placeholder="Enter your business address"
                    value={formData.businessAddress}
                    onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                    className={errors.businessAddress ? "border-destructive" : ""}
                    required
                  />
                  {errors.businessAddress && (
                    <p className="text-sm text-destructive">{errors.businessAddress}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className={errors.city ? "border-destructive" : ""}
                      required
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="relative">
                      <Input
                        id="country"
                        placeholder="Search or select country"
                        value={formData.country || countrySearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCountrySearch(value);
                          if (africanCountries.includes(value)) {
                            handleInputChange("country", value);
                          } else {
                            handleInputChange("country", "");
                          }
                        }}
                        onFocus={() => {
                          setCountrySearch("");
                          setShowCountryDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                        className={errors.country ? "border-destructive" : ""}
                        required
                      />
                      {showCountryDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                onClick={() => {
                                  handleInputChange("country", country);
                                  setCountrySearch("");
                                  setShowCountryDropdown(false);
                                }}
                              >
                                {country}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No countries found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.country && (
                      <p className="text-sm text-destructive">{errors.country}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select onValueChange={(value) => handleInputChange("businessType", value)}>
                    <SelectTrigger className={errors.businessType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Trading">General Trading</SelectItem>
                      <SelectItem value="Food & Beverages">Food & Beverages</SelectItem>
                      <SelectItem value="Clothing & Textiles">Clothing & Textiles</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Agriculture & Farming">Agriculture & Farming</SelectItem>
                      <SelectItem value="Beauty & Cosmetics">Beauty & Cosmetics</SelectItem>
                      <SelectItem value="Hardware & Tools">Hardware & Tools</SelectItem>
                      <SelectItem value="Pharmacy & Healthcare">Pharmacy & Healthcare</SelectItem>
                      <SelectItem value="Automotive">Automotive</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.businessType && (
                    <p className="text-sm text-destructive">{errors.businessType}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-destructive" : ""}
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          {/* Google Sign In Button */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                <KeyRound className="w-3 h-3" />
                Forgot Password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline text-sm"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;