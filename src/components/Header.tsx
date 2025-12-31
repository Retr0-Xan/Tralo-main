import { Link } from "react-router-dom";
import logoDark from "@/assets/tralo-logo-dark-mode-removebg-preview.png";

const Header = () => {
  const navLinks = [
    { label: "About", href: "/about" },
    { label: "Help", href: "/help" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full py-3 md:py-4 px-6 md:px-12 lg:px-16 bg-primary">
      <div className="max-w-[1150px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src={logoDark}
            alt="Tralo"
            className="h-[35px] md:h-[41px] w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-3 md:gap-6">
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-primary-foreground/80 text-sm hover:text-primary-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <span className="hidden sm:flex text-sm text-primary-foreground/70 font-medium items-center gap-1.5">
            Ghana <span className="text-base">🇬🇭</span>
          </span>
          <Link
            to="/auth"
            className="text-primary-foreground font-semibold hover:opacity-70 transition-opacity text-sm md:text-base"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
