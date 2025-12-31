import { useEffect, useRef, useState } from "react";

const benefits = [
  {
    headline: "No more guessing your profit",
    description: "Tralo shows you exactly how your business is doing, daily."
  },
  {
    headline: "No more lost records",
    description: "Sales, stock, and expenses saved digitally and securely."
  },
  {
    headline: "No more running blind",
    description: "Spot patterns, track progress, and grow with confidence."
  }
];

const BenefitsSection = () => {
  const headlineRef = useRef<HTMLElement>(null);
  const benefitRefs = useRef<(HTMLElement | null)[]>([]);
  
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [eyebrowVisible, setEyebrowVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [benefitsVisible, setBenefitsVisible] = useState<boolean[]>([false, false, false]);

  // Headline section observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !headlineVisible) {
          setHeadlineVisible(true);
        }
      },
      { threshold: 0.5, rootMargin: "-10% 0px" }
    );

    if (headlineRef.current) {
      observer.observe(headlineRef.current);
    }

    return () => observer.disconnect();
  }, [headlineVisible]);

  // Staggered animation for headline section - delayed reveal
  useEffect(() => {
    if (!headlineVisible) return;

    const eyebrowTimer = setTimeout(() => setEyebrowVisible(true), 400);
    const titleTimer = setTimeout(() => setTitleVisible(true), 900);

    return () => {
      clearTimeout(eyebrowTimer);
      clearTimeout(titleTimer);
    };
  }, [headlineVisible]);

  // Individual benefit observers
  useEffect(() => {
    const observers = benefits.map((_, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !benefitsVisible[index]) {
            setBenefitsVisible(prev => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          }
        },
        { threshold: 0.4 }
      );

      if (benefitRefs.current[index]) {
        observer.observe(benefitRefs.current[index]!);
      }

      return observer;
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, [benefitsVisible]);

  return (
    <>
      {/* Headline Section */}
      <section 
        ref={headlineRef}
        className="min-h-[55vh] md:min-h-[50vh] flex items-center justify-center px-6 pt-20 md:pt-28 pb-16 md:pb-20"
      >
        <div className="max-w-[1100px] mx-auto text-center">
          <p 
            className={`text-xs md:text-sm tracking-[0.2em] uppercase text-muted-foreground/60 mb-8 transition-all duration-1000 ${
              eyebrowVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Used by businesses across Ghana
          </p>

          <h2 
            className={`text-3xl md:text-4xl lg:text-5xl font-bold text-foreground transition-all duration-1000 ${
              titleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Built for businesses on the rise.
          </h2>
        </div>
      </section>

      {/* Individual Benefit Sections */}
      {benefits.map((benefit, index) => (
        <section
          key={index}
          ref={(el) => (benefitRefs.current[index] = el)}
          className="min-h-[40vh] md:min-h-[35vh] flex items-center justify-center px-6 py-14 md:py-20"
        >
          <div className="max-w-[1100px] mx-auto text-center">
            <h3 
              className={`text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-5 transition-all duration-1000 ${
                benefitsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              {benefit.headline}
            </h3>
            <p 
              className={`text-lg md:text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                benefitsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              {benefit.description}
            </p>
          </div>
        </section>
      ))}
    </>
  );
};

export default BenefitsSection;
