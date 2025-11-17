import { useState, useEffect } from "react";
import { ArrowLeft, User, Building, Phone, MapPin, Clock, Camera, Edit, Save, X, LogOut, Palette, FileText, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import EnquiryForm from "@/components/forms/EnquiryForm";
import BusinessCardGenerator from "@/components/BusinessCardGenerator";
import QRCodeDisplay from "@/components/QRCodeDisplay";

interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  businessAddress: string;
  businessType: string;
  description: string;
  slogan: string;
  operatingHours: string;
  registrationNumber: string;
  logoUrl: string;
  yearsFounded: string;
  stockFreshness: string;
  communityFocus: string;
  qualityCommitment: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: "",
    ownerName: "",
    phoneNumber: "",
    email: "",
    businessAddress: "",
    businessType: "",
    description: "",
    slogan: "",
    operatingHours: "",
    registrationNumber: "",
    logoUrl: "",
    yearsFounded: "",
    stockFreshness: "",
    communityFocus: "",
    qualityCommitment: ""
  });

  const [editedProfile, setEditedProfile] = useState<BusinessProfile>(profile);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        setFetchingProfile(true);

        // Fetch from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // Fetch from business_profiles table if exists
        const { data: businessData, error: businessError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Combine data from both tables
        const combinedProfile: BusinessProfile = {
          businessName: businessData?.business_name || profileData?.business_name || "",
          ownerName: businessData?.owner_name || profileData?.owner_name || "",
          phoneNumber: businessData?.phone_number || "",
          email: profileData?.email || user.email || "",
          businessAddress: businessData?.business_address || "",
          businessType: businessData?.business_type || profileData?.business_type || "",
          description: businessData?.description || "",
          slogan: businessData?.slogan || "",
          operatingHours: businessData?.operating_hours || "",
          registrationNumber: businessData?.registration_number || "",
          logoUrl: businessData?.logo_url || "",
          yearsFounded: (businessData as any)?.years_founded || "",
          stockFreshness: (businessData as any)?.stock_freshness || "",
          communityFocus: (businessData as any)?.community_focus || "",
          qualityCommitment: (businessData as any)?.quality_commitment || ""
        };

        setProfile(combinedProfile);
        setEditedProfile(combinedProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  const businessTypes = [
    "General Trading",
    "Food & Beverages",
    "Clothing & Textiles",
    "Electronics",
    "Agriculture & Farming",
    "Beauty & Cosmetics",
    "Hardware & Tools",
    "Pharmacy & Healthcare",
    "Automotive",
    "Other"
  ];

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update business_profiles table
      const { error: businessError } = await supabase
        .from('business_profiles')
        .upsert({
          user_id: user.id,
          business_name: editedProfile.businessName,
          owner_name: editedProfile.ownerName,
          phone_number: editedProfile.phoneNumber,
          email: editedProfile.email,
          business_address: editedProfile.businessAddress,
          business_type: editedProfile.businessType,
          description: editedProfile.description,
          slogan: editedProfile.slogan,
          operating_hours: editedProfile.operatingHours,
          registration_number: editedProfile.registrationNumber,
          logo_url: editedProfile.logoUrl,
          years_founded: editedProfile.yearsFounded,
          stock_freshness: editedProfile.stockFreshness,
          community_focus: editedProfile.communityFocus,
          quality_commitment: editedProfile.qualityCommitment,
        }, {
          onConflict: 'user_id'
        });

      if (businessError) throw businessError;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: editedProfile.email,
          business_name: editedProfile.businessName,
          owner_name: editedProfile.ownerName,
          business_type: editedProfile.businessType,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setProfile(editedProfile);
      setIsEditing(false);

      toast({
        title: "Profile Updated",
        description: "Your business profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BusinessProfile, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to logout. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Navigate to auth page after logout
      navigate("/auth");
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Call the database function to delete all user data
      const { error } = await supabase.rpc('delete_user_account', {
        user_uuid: user.id
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out and redirect to auth page
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || fetchingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <ThemeToggle />
                <Button onClick={handleEdit} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button onClick={handleLogout} variant="destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Business Profile</h1>
        <p className="text-muted-foreground">
          Manage your business information and settings
        </p>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {/* Business Logo & Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Your main business details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={isEditing ? editedProfile.logoUrl : profile.logoUrl} alt="Business Logo" />
                  <AvatarFallback className="text-2xl">
                    {getInitials(isEditing ? editedProfile.businessName : profile.businessName)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={() => {
                      toast({
                        title: "Photo Upload",
                        description: "Photo upload functionality will be implemented soon.",
                      });
                    }}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">
                  {isEditing ? editedProfile.businessName : profile.businessName}
                </h3>
                <p className="text-muted-foreground mb-1">
                  {isEditing ? editedProfile.businessType : profile.businessType}
                </p>
                {(isEditing ? editedProfile.slogan : profile.slogan) && (
                  <p className="text-sm text-primary font-medium italic">
                    "{isEditing ? editedProfile.slogan : profile.slogan}"
                  </p>
                )}
              </div>
            </div>

            {/* Business Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={isEditing ? editedProfile.businessName : profile.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="ownerName">Owner Name *</Label>
                <Input
                  id="ownerName"
                  value={isEditing ? editedProfile.ownerName : profile.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={isEditing ? editedProfile.phoneNumber : profile.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={isEditing ? editedProfile.email : profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="businessAddress">Business Address *</Label>
                <Input
                  id="businessAddress"
                  value={isEditing ? editedProfile.businessAddress : profile.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                {isEditing ? (
                  <select
                    id="businessType"
                    value={editedProfile.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="w-full p-2 border border-input rounded-md bg-background"
                  >
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={profile.businessType}
                    disabled
                  />
                )}
              </div>
              <div>
                <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
                <Input
                  id="registrationNumber"
                  value={isEditing ? editedProfile.registrationNumber : profile.registrationNumber}
                  onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter if you have one"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Description & Slogan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Business Description & Slogan
            </CardTitle>
            <CardDescription>
              Tell customers about your business and create a memorable catchphrase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="slogan">Business Slogan/Motto/Catchphrase</Label>
              <Input
                id="slogan"
                value={isEditing ? editedProfile.slogan : profile.slogan}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Your trusted neighborhood store! 🌟"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A short, memorable phrase that represents your business
              </p>
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={isEditing ? editedProfile.description : profile.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={!isEditing}
                placeholder="Describe your business, what you sell, and what makes you special..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Business Overview
            </CardTitle>
            <CardDescription>
              Key information about your business that customers will see
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearsFounded">Years in Business</Label>
                <Input
                  id="yearsFounded"
                  value={isEditing ? editedProfile.yearsFounded : profile.yearsFounded}
                  onChange={(e) => handleInputChange('yearsFounded', e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., 10+ Years"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long have you been in business?
                </p>
              </div>

              <div>
                <Label htmlFor="stockFreshness">Stock Freshness</Label>
                <Input
                  id="stockFreshness"
                  value={isEditing ? editedProfile.stockFreshness : profile.stockFreshness}
                  onChange={(e) => handleInputChange('stockFreshness', e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Daily Fresh Stock"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How fresh are your products?
                </p>
              </div>

              <div>
                <Label htmlFor="communityFocus">Community Focus</Label>
                <Input
                  id="communityFocus"
                  value={isEditing ? editedProfile.communityFocus : profile.communityFocus}
                  onChange={(e) => handleInputChange('communityFocus', e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Local Community Focused"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How do you serve your community?
                </p>
              </div>

              <div>
                <Label htmlFor="qualityCommitment">Quality Commitment</Label>
                <Input
                  id="qualityCommitment"
                  value={isEditing ? editedProfile.qualityCommitment : profile.qualityCommitment}
                  onChange={(e) => handleInputChange('qualityCommitment', e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Quality Products"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What's your commitment to quality?
                </p>
              </div>
            </div>

            {/* Display as badges when not editing */}
            {!isEditing && (profile.yearsFounded || profile.stockFreshness || profile.communityFocus || profile.qualityCommitment) && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-3">Your Business Highlights:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.yearsFounded && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      <Clock className="w-3 h-3" />
                      {profile.yearsFounded}
                    </div>
                  )}
                  {profile.stockFreshness && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      🌱 {profile.stockFreshness}
                    </div>
                  )}
                  {profile.communityFocus && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      🏠 {profile.communityFocus}
                    </div>
                  )}
                  {profile.qualityCommitment && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      ⭐ {profile.qualityCommitment}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Operating Hours
            </CardTitle>
            <CardDescription>
              Let customers know when you're open for business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="operatingHours">Operating Hours</Label>
            <Textarea
              id="operatingHours"
              rows={3}
              value={isEditing ? editedProfile.operatingHours : profile.operatingHours}
              onChange={(e) => handleInputChange('operatingHours', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Monday - Friday: 8:00 AM - 6:00 PM, Saturday: 8:00 AM - 4:00 PM"
            />
          </CardContent>
        </Card>

        {/* Business Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Business Overview</CardTitle>
            <CardDescription>
              Key information about your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary mb-1">10+</div>
                <div className="text-sm text-muted-foreground">Years in Business</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600 mb-1">Daily</div>
                <div className="text-sm text-muted-foreground">Fresh Stock</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600 mb-1">Local</div>
                <div className="text-sm text-muted-foreground">Community Focused</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <div className="text-2xl font-bold text-orange-600 mb-1">Quality</div>
                <div className="text-sm text-muted-foreground">Products</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Card Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Business Card
            </CardTitle>
            <CardDescription>
              Create a professional business card to share with customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessCardGenerator
              businessName={profile.businessName || "Your Business"}
              location={profile.businessAddress || "Your Location"}
              products={profile.businessType ? [profile.businessType] : ["Products & Services"]}
              phoneNumber={profile.phoneNumber || "Phone Number"}
              whatsAppNumber={profile.phoneNumber}
            />
          </CardContent>
        </Card>

        {/* Contact Support Form */}
        <EnquiryForm />

        {/* QR Code Display */}
        <QRCodeDisplay />

        {/* Danger Zone - Delete Account */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanent actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                <h3 className="font-semibold mb-2 text-destructive">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. This will permanently delete:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4 ml-4 list-disc">
                  <li>All your business profile information</li>
                  <li>All inventory records and products</li>
                  <li>All sales history and customer data</li>
                  <li>All documents, receipts, and invoices</li>
                  <li>All financial records and reports</li>
                  <li>All reminders and notes</li>
                </ul>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? "Deleting Account..." : "Delete Account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This action <strong>cannot be undone</strong>. This will permanently delete your
                          account and remove all your data from our servers.
                        </p>
                        <p className="text-destructive font-semibold">
                          All your business data, sales records, inventory, and customer information will be
                          permanently lost.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;