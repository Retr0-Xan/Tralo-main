import Layout from "@/components/Layout";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-6 animate-fade-in">
          Contact Us
        </h1>
        <p className="text-muted-foreground text-lg text-center mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Have questions or need help? We're here for you.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Support Email */}
          <div 
            className="bg-secondary rounded-xl p-8 text-center animate-fade-in"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">Email Support</h2>
            <p className="text-muted-foreground mb-6">
              Send us an email and we'll get back to you within 24 hours.
            </p>
            <a href="mailto:info.traloapp@gmail.com">
              <Button variant="outline" className="w-full mb-2">
                info.traloapp@gmail.com
              </Button>
            </a>
            <a href="mailto:traloapp@gmail.com">
              <Button variant="outline" className="w-full">
                traloapp@gmail.com
              </Button>
            </a>
          </div>

          {/* WhatsApp Support */}
          <div 
            className="bg-secondary rounded-xl p-8 text-center animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">WhatsApp Support</h2>
            <p className="text-muted-foreground mb-6">
              Chat with us directly on WhatsApp for quick assistance.
            </p>
            <a 
              href="https://wa.me/1234567890" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                Chat on WhatsApp
              </Button>
            </a>
          </div>
        </div>

        {/* Office Address (Optional) */}
        <div 
          className="mt-8 bg-muted rounded-xl p-8 text-center animate-fade-in"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Office Address</h2>
          </div>
          <p className="text-muted-foreground">
            Coming soon — We're setting up our physical office.
            <br />
            In the meantime, reach us via email or WhatsApp.
          </p>
        </div>

        {/* Response Time Notice */}
        <p className="text-center text-muted-foreground text-sm mt-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          Our support team typically responds within 24 hours during business days.
        </p>
      </div>
    </Layout>
  );
};

export default Contact;
