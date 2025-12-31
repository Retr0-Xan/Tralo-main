import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DiscoverMoreSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.4 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  const handleScrollToFooter = () => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      ref={ref}
      className={`py-16 md:py-24 transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <button
        onClick={handleScrollToFooter}
        className="group flex flex-col items-center gap-4 mx-auto cursor-pointer bg-transparent border-none"
      >
        <span className="text-sm md:text-base font-light text-muted-foreground/70 group-hover:text-muted-foreground transition-colors duration-300">
          Learn more about Tralo
        </span>
        <ChevronDown 
          className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground/70 animate-bounce-slow transition-colors duration-300" 
        />
      </button>
    </section>
  );
};

export default DiscoverMoreSection;
