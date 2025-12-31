import Layout from "@/components/Layout";
import { Shield, FileText, Lock, Eye, Trash2, Bell } from "lucide-react";

const Privacy = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-6 animate-fade-in">
          Privacy & Terms
        </h1>
        <p className="text-muted-foreground text-lg text-center mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Your privacy matters. Here's how we protect and handle your data.
        </p>

        {/* Privacy Policy */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-foreground" />
            <h2 className="text-3xl font-bold text-foreground">Privacy Policy</h2>
          </div>

          <div className="space-y-8">
            <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">Data Collection</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We collect only the information necessary to provide our services. This includes your business name, 
                contact information, and business data you enter into Tralo (sales records, inventory, customer information). 
                We do not collect personal data beyond what you explicitly provide.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-3 mb-3">
                <Eye className="w-5 h-5 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">How We Use Your Data</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Your data is used solely to provide and improve Tralo services. We use it to power your dashboard, 
                generate reports, and help you manage your business. We never sell your data to third parties or 
                use it for advertising purposes.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">Data Security</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data. All data transmission is 
                encrypted using SSL/TLS protocols. Your business information is stored securely and access is 
                restricted to authorized personnel only.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-3 mb-3">
                <Trash2 className="w-5 h-5 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">Data Deletion</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to request deletion of your data at any time. Upon account deletion, 
                all your business data will be permanently removed from our servers within 30 days.
              </p>
            </div>
          </div>
        </section>

        {/* Terms of Service */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-foreground" />
            <h2 className="text-3xl font-bold text-foreground">Terms of Service</h2>
          </div>

          <div className="space-y-8">
            <div className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <h3 className="text-xl font-semibold text-foreground mb-3">Acceptance of Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                By using Tralo, you agree to these terms of service. If you do not agree with any part of these 
                terms, please do not use our services.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <h3 className="text-xl font-semibold text-foreground mb-3">Use of Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                Tralo is provided for legitimate business management purposes. You agree not to use the service 
                for any illegal activities, to attempt to gain unauthorized access to our systems, or to interfere 
                with other users' access to the service.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.45s" }}>
              <h3 className="text-xl font-semibold text-foreground mb-3">Account Responsibility</h3>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for maintaining the security of your account and all activities that occur 
                under your account. Please use a strong password and do not share your login credentials.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <h3 className="text-xl font-semibold text-foreground mb-3">Service Availability</h3>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to provide uninterrupted service, we cannot guarantee 100% uptime. We may 
                occasionally need to perform maintenance or updates that temporarily affect availability.
              </p>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.55s" }}>
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-5 h-5 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">Changes to Terms</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms from time to time. When we do, we will notify you via email or 
                through a notice on our platform. Continued use of Tralo after changes constitutes acceptance 
                of the updated terms.
              </p>
            </div>
          </div>
        </section>

        <p className="text-center text-muted-foreground text-sm mt-16 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          Last updated: December 2025
        </p>
      </div>
    </Layout>
  );
};

export default Privacy;
