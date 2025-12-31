import { Link } from "react-router-dom";
import logoDark from "@/assets/tralo-logo-dark-mode-removebg-preview.png";

const Header = () => {
  return (
    <header className="w-full pt-5 pb-4 md:pt-8 md:pb-6 px-6 md:px-12 lg:px-16 bg-primary">
      <div className="max-w-[1150px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src={logoDark}
            alt="Tralo"
            className="h-6 md:h-7 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-4 md:gap-5">
          <span className="text-sm text-primary-foreground/70 font-medium flex items-center gap-1.5">
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
