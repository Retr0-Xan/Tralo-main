import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  const footerLinks = [
    { label: "About", href: "/about" },
    { label: "Help & Tutorials", href: "/help" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy & Terms", href: "/privacy" },
  ];

  return (
    <footer 
      ref={footerRef}
      className="w-full pt-20 md:pt-28 pb-10 md:pb-12 px-6 md:px-12 mt-auto"
    >
      <div 
        className={`transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <nav className="max-w-[1150px] mx-auto flex items-center justify-center gap-3 md:gap-6 flex-nowrap">
          {footerLinks.map((link, index) => (
            <span key={link.href} className="flex items-center">
              <Link
                to={link.href}
                className="text-muted-foreground/70 text-xs hover:text-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-muted-foreground/30 ml-3 md:ml-6">·</span>
              )}
            </span>
          ))}
        </nav>
        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          © {new Date().getFullYear()} Tralo. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
