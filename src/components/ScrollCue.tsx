import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ScrollCue = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div 
      ref={ref}
      className={`flex flex-col items-center py-8 md:py-12 group cursor-pointer transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <p className="text-sm md:text-base font-semibold text-foreground/70 group-hover:text-foreground transition-colors duration-300 mb-3">
        Learn more about how Tralo works
      </p>
      <ChevronDown 
        className="w-5 h-5 text-foreground/60 group-hover:text-foreground/80 animate-scroll-bounce transition-colors duration-300" 
      />
    </div>
  );
};

export default ScrollCue;
