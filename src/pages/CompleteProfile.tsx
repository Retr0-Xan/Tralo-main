import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import TraloLogo from "@/components/TraloLogo";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const profileSchema = z.object({
    businessName: z.string().trim().min(1, { message: "Business name is required" }).max(100, { message: "Business name must be less than 100 characters" }),
    ownerName: z.string().trim().min(1, { message: "Owner name is required" }).max(100, { message: "Owner name must be less than 100 characters" }),
    phoneNumber: z.string().trim().min(10, { message: "Phone number must be at least 10 digits" }).max(20, { message: "Phone number must be less than 20 characters" }),
    businessAddress: z.string().trim().min(1, { message: "Business address is required" }).max(200, { message: "Business address must be less than 200 characters" }),
    city: z.string().trim().min(1, { message: "City is required" }).max(100, { message: "City must be less than 100 characters" }),
    country: z.string().trim().min(1, { message: "Country is required" }).max(100, { message: "Country must be less than 100 characters" }),
    businessType: z.string().min(1, { message: "Please select a business type" })
});

const CompleteProfile = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { toast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
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

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            const validatedData = profileSchema.parse(formData);

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Error",
                    description: "You must be signed in to complete your profile.",
                    variant: "destructive",
                });
                navigate("/auth");
                return;
            }

            // Create business profile
            const { error: profileError } = await supabase
                .from('business_profiles')
                .insert({
                    user_id: user.id,
                    business_name: validatedData.businessName,
                    owner_name: validatedData.ownerName,
                    phone_number: validatedData.phoneNumber,
                    business_address: validatedData.businessAddress,
                    business_type: validatedData.businessType,
                    email: user.email || ''
                });

            if (profileError) {
                // If profile already exists, update it
                if (profileError.code === '23505') {
                    const { error: updateError } = await supabase
                        .from('business_profiles')
                        .update({
                            business_name: validatedData.businessName,
                            owner_name: validatedData.ownerName,
                            phone_number: validatedData.phoneNumber,
                            business_address: validatedData.businessAddress,
                            business_type: validatedData.businessType
                        })
                        .eq('user_id', user.id);

                    if (updateError) throw updateError;
                } else {
                    throw profileError;
                }
            }

            // Update profiles table
            const { error: profilesError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    business_name: validatedData.businessName,
                    owner_name: validatedData.ownerName,
                    location: `${validatedData.city}, ${validatedData.country}`,
                    business_type: validatedData.businessType
                });

            if (profilesError) throw profilesError;

            toast({
                title: "Profile Completed! 🎉",
                description: "Welcome to Tralo! You can now start managing your business.",
            });

            navigate("/");
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
                console.error('Error completing profile:', error);
                toast({
                    title: "Error",
                    description: "Failed to complete profile. Please try again.",
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
                    <div className="-mt-12 flex justify-center">
                        <TraloLogo className="h-[5.7rem] w-auto" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-4 mt-0">
                        Proof today, the future of trade tomorrow
                    </p>
                    <CardTitle>Complete Your Profile</CardTitle>
                    <CardDescription>
                        Please provide your business information to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Complete Profile"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CompleteProfile;
