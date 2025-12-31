import Layout from "@/components/Layout";
import { PlayCircle, ShoppingCart, Package, Receipt, BarChart3, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tutorials = [
  {
    icon: ShoppingCart,
    title: "How to Record a Sale",
    description: "Learn how to quickly record sales transactions and keep accurate records of every purchase.",
    videoPlaceholder: true,
  },
  {
    icon: Package,
    title: "How to Add Inventory",
    description: "Step-by-step guide to adding products to your inventory and managing stock levels.",
    videoPlaceholder: true,
  },
  {
    icon: Receipt,
    title: "How to Create a Receipt",
    description: "Generate professional receipts for your customers in seconds.",
    videoPlaceholder: true,
  },
  {
    icon: BarChart3,
    title: "How to View Daily Sales",
    description: "Track your daily sales performance and understand your business trends.",
    videoPlaceholder: true,
  },
];

const faqs = [
  {
    question: "Is Tralo free to use?",
    answer: "Yes! Tralo offers a free tier that includes all essential features for managing your small business. Premium features may be available in the future for advanced users.",
  },
  {
    question: "Can I use Tralo on my phone?",
    answer: "Absolutely! Tralo is designed to work seamlessly on mobile devices, tablets, and desktops. Access your business data anywhere, anytime.",
  },
  {
    question: "How do I get started with Tralo?",
    answer: "Simply visit tralo.vercel.app, create your free account, and follow the quick setup guide. You'll be managing your business in minutes.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we take data security seriously. Your business data is encrypted and stored securely. We never share your information with third parties.",
  },
  {
    question: "Can I export my data?",
    answer: "Yes, Tralo allows you to export your sales records, inventory lists, and customer data for your own records or accounting purposes.",
  },
  {
    question: "Do I need internet to use Tralo?",
    answer: "An internet connection is required to sync your data across devices. However, we're working on offline capabilities for future updates.",
  },
];

const Help = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-6 animate-fade-in">
          Help & Tutorials
        </h1>
        <p className="text-muted-foreground text-lg text-center mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Learn how to get the most out of Tralo with our quick guides and video tutorials.
        </p>

        {/* Video Tutorials */}
        <section className="mb-20">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 flex items-center gap-3">
            <PlayCircle className="w-7 h-7" />
            Video Tutorials
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tutorials.map((tutorial, index) => (
              <div 
                key={tutorial.title}
                className="bg-secondary rounded-xl p-6 hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
              >
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                  <PlayCircle className="w-16 h-16 text-muted-foreground opacity-50" />
                </div>
                <div className="flex items-start gap-3">
                  <tutorial.icon className="w-5 h-5 text-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{tutorial.title}</h3>
                    <p className="text-muted-foreground text-sm">{tutorial.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm text-center mt-6">
            Video tutorials coming soon. Stay tuned!
          </p>
        </section>

        {/* FAQs */}
        <section className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8 flex items-center gap-3">
            <HelpCircle className="w-7 h-7" />
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </Layout>
  );
};

export default Help;
