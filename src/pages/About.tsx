import Layout from "@/components/Layout";
import { Users, Target, Eye, Lightbulb } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-16 animate-fade-in">
          About Tralo
        </h1>

        {/* What Tralo Is */}
        <section className="mb-16 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">What is Tralo?</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Tralo is a simple, powerful business management tool built for small and growing businesses, as well as entrepreneurs. 
            It helps you track sales, manage inventory, keep customer records, and monitor daily activity — all from one easy-to-use platform. 
            No complex software, no steep learning curve — just the tools you need to run your business efficiently as it grows.
          </p>
        </section>

        {/* Who It's For */}
        <section className="mb-16 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Who It's For</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Tralo is built for businesses at every stage of growth, from solo founders and market vendors to structured SMEs and expanding companies.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            Whether you run a shop, manage a service business, oversee multiple outlets, or are building something bigger, Tralo helps you reduce paperwork, gain clarity, and run your operations with confidence. As your business grows, Tralo grows with you.
          </p>
        </section>

        {/* Mission */}
        <section className="mb-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Our Mission</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            To empower businesses with simple, accessible tools that bring structure, clarity, and visibility to everyday operations. 
            We believe every entrepreneur and growing company deserves professional-grade systems that are easy to use, affordable, and built to scale with their ambitions.
          </p>
        </section>

        {/* Vision */}
        <section className="mb-16 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Our Vision</h2>
          </div>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A future where every business, from the first sale to full scale, from the smallest shop to the next great company, operates with clarity, structure, and confidence.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            We envision Tralo becoming the operating layer that powers how businesses run, grow, and trade across Africa and beyond.
          </p>
        </section>

        {/* Team */}
        <section className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">The Team</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Tralo is built by a small, focused team of builders and entrepreneurs who understand the realities of running a business from the ground up. 
            We're committed to creating practical tools that bring clarity, structure, and confidence to everyday business operations.
          </p>
        </section>
      </div>
    </Layout>
  );
};

export default About;
