import { Link } from "react-router-dom";
import TraloLogo from "./TraloLogo";

const Footer = () => {
  const productLinks = [
    { label: "Sales Tracking", href: "/about" },
    { label: "Inventory", href: "/about" },
    { label: "Documents", href: "/about" },
    { label: "Trade Index", href: "/about" },
  ];

  const companyLinks = [
    { label: "About", href: "/about" },
    { label: "Help & Tutorials", href: "/help" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy & Terms", href: "/privacy" },
  ];

  return (
    <footer className="w-full border-t border-border/50 bg-muted/30">
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-2">
            <TraloLogo className="h-9" />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
              The all-in-one business tool for small and growing businesses across Ghana and West Africa.
            </p>

          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Tralo. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
