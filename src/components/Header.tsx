import { Link } from "react-router-dom";
import TraloLogo from "./TraloLogo";

const Header = () => {
  return (
    <header className="w-full pt-5 pb-4 md:pt-8 md:pb-6 px-6 md:px-12 lg:px-16">
      <div className="max-w-[1150px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <TraloLogo className="h-6 md:h-7" />
        </Link>
        <div className="flex items-center gap-4 md:gap-5">
          <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            Ghana <span className="text-base">🇬🇭</span>
          </span>
          <Link
            to="/auth"
            className="text-foreground font-semibold hover:opacity-70 transition-opacity text-sm md:text-base"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
