import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import RotatingHeadline from "@/components/RotatingHeadline";
import BenefitsSection from "@/components/BenefitsSection";
import ScrollCue from "@/components/ScrollCue";
import DiscoverMoreSection from "@/components/DiscoverMoreSection";

const Index = () => {
    const [headlineComplete, setHeadlineComplete] = useState(false);

    return (
        <Layout>
            <section className="flex flex-col items-center justify-center px-6 pt-12 pb-16 md:pt-20 md:pb-24 lg:pt-24 lg:pb-28 text-center max-w-[1150px] mx-auto min-h-[70vh] md:min-h-[65vh]">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight min-h-[2.4em]">
                    <RotatingHeadline onComplete={() => setHeadlineComplete(true)} />
                </h1>

                <p
                    className={`mt-8 md:mt-10 text-lg md:text-xl text-muted-foreground max-w-md leading-relaxed transition-opacity duration-800 ${headlineComplete ? "animate-fade-in-opacity" : "opacity-40"
                        }`}
                >
                    Tralo helps small and growing businesses track sales, inventory, customers, and daily activity — all in one place.
                </p>

                <Link
                    to="/auth"
                    className={`mt-10 md:mt-12 transition-opacity duration-500 ${headlineComplete ? "opacity-100" : "opacity-0"}`}
                >
                    <Button
                        size="lg"
                        className="group relative px-8 py-6 text-lg rounded-xl font-bold overflow-hidden bg-primary hover:bg-primary/85 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <span className="relative z-10">Get started — it's free</span>
                        <div
                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent animate-shine"
                            style={{ animationDelay: "2s", animationIterationCount: "infinite", animationDuration: "7s" }}
                        />
                    </Button>
                </Link>
            </section>

            <ScrollCue />

            <BenefitsSection />

            <DiscoverMoreSection />
        </Layout>
    );
};

export default Index;
