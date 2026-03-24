import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import RotatingHeadline from "@/components/RotatingHeadline";
import {
    BarChart3, Package, FileText, Receipt, TrendingUp,
    Star, ArrowRight, CheckCircle2, Bell
} from "lucide-react";

// --- Scroll animation hook ---
function useInView(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, ...options }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { ref, isInView };
}

// --- Animated counter ---
function AnimatedCounter({ end, suffix = "", decimals = 0 }: { end: number; suffix?: string; decimals?: number }) {
    const [count, setCount] = useState(0);
    const { ref, isInView } = useInView();
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!isInView || hasAnimated.current) return;
        hasAnimated.current = true;
        const duration = 2000;
        const startTime = performance.now();

        function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(parseFloat((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }, [isInView, end, decimals]);

    return (
        <span ref={ref}>
            {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
            {suffix}
        </span>
    );
}

// --- Data ---
const features = [
    {
        icon: Receipt,
        title: "Sales Tracking",
        description: "Record every sale instantly. Daily summaries, profit margins, and category breakdowns at your fingertips.",
    },
    {
        icon: Package,
        title: "Inventory Management",
        description: "Know exactly what's in stock. Get low-stock alerts and track goods from supplier to shelf.",
    },
    {
        icon: FileText,
        title: "Document Generation",
        description: "Create invoices, receipts, and purchase orders in seconds. Professional documents, always ready.",
    },
    {
        icon: TrendingUp,
        title: "Trade Index",
        description: "See how your business compares. Track market trends and benchmark your performance.",
    },
    {
        icon: Bell,
        title: "Smart Reminders",
        description: "Never miss a restock date, payment due, or follow-up. Tralo keeps your calendar on track.",
    },
    {
        icon: BarChart3,
        title: "Reports & Analytics",
        description: "Turn raw data into clear insights. Spot trends, find opportunities, and make smarter decisions.",
    },
];

const steps = [
    {
        number: "01",
        title: "Create your account",
        description: "Sign up in under a minute. No credit card, no complex setup — just your email and you're in.",
    },
    {
        number: "02",
        title: "Set up your business",
        description: "Add your products, set prices, and configure categories. Tralo adapts to how you already work.",
    },
    {
        number: "03",
        title: "Start tracking everything",
        description: "Record sales, manage stock, generate documents, and watch your business insights grow daily.",
    },
];

const testimonials = [
    {
        quote: "Before Tralo, I was writing everything in a notebook. Now I know my exact profit every single day.",
        name: "Akua Mensah",
        business: "Akua's Provisions, Accra",
        rating: 5,
    },
    {
        quote: "The inventory alerts alone saved me from running out of my best-selling items three times last month.",
        name: "Kofi Asante",
        business: "K&B Electronics, Kumasi",
        rating: 5,
    },
    {
        quote: "My customers are impressed when I send them professional invoices. It makes my small business feel established.",
        name: "Ama Owusu",
        business: "Fresh Harvest Market, Takoradi",
        rating: 5,
    },
];

const stats = [
    { value: 200, suffix: "+", label: "Active businesses" },
    { value: 150, suffix: "K+", label: "Transactions tracked" },
    { value: 99.9, suffix: "%", label: "Uptime reliability" },
    { value: 4.8, suffix: "/5", label: "User satisfaction" },
];

// --- Page ---
const Landing = () => {
    const [headlineComplete, setHeadlineComplete] = useState(false);

    const statsSection = useInView();
    const featuresSection = useInView();
    const stepsSection = useInView();
    const previewSection = useInView();
    const testimonialsSection = useInView();
    const ctaSection = useInView();

    return (
        <Layout>
            {/* ==================== HERO ==================== */}
            <section className="relative overflow-hidden">
                {/* Background blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-[1200px] mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-32 lg:pt-28 lg:pb-36">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left: Text */}
                        <div className="text-center lg:text-left">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight min-h-[2.4em]">
                                <RotatingHeadline onComplete={() => setHeadlineComplete(true)} />
                            </h1>

                            <p
                                className={`mt-6 md:mt-8 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed transition-all duration-700 mx-auto lg:mx-0 ${headlineComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                                    }`}
                            >
                                Tralo helps small and growing businesses in Ghana track sales, inventory, customers, and daily activity — all in one place.
                            </p>

                            <div
                                className={`mt-8 md:mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start transition-all duration-500 delay-200 ${headlineComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                                    }`}
                            >
                                <Link to="/auth">
                                    <Button
                                        size="lg"
                                        className="group relative px-8 py-6 text-lg rounded-xl font-bold overflow-hidden bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            Get started free
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                        <div
                                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent animate-shine"
                                            style={{ animationDelay: "2s", animationIterationCount: "infinite", animationDuration: "7s" }}
                                        />
                                    </Button>
                                </Link>
                                <Link to="/about">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="px-8 py-6 text-lg rounded-xl font-semibold border-2 hover:bg-muted/50 transition-all w-full sm:w-auto"
                                    >
                                        See how it works
                                    </Button>
                                </Link>
                            </div>

                            <p
                                className={`mt-6 text-sm text-muted-foreground/60 transition-all duration-500 delay-300 ${headlineComplete ? "opacity-100" : "opacity-0"
                                    }`}
                            >
                                <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-accent" />
                                Free to use · No credit card required
                            </p>
                        </div>

                        {/* Right: Dashboard mockup */}
                        <div
                            className={`relative transition-all duration-1000 delay-500 ${headlineComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                }`}
                        >
                            <div className="relative mx-auto max-w-md lg:max-w-none">
                                {/* Main card */}
                                <div className="bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
                                    <div className="bg-primary px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-primary-foreground/30" />
                                            <span className="text-primary-foreground/80 text-sm font-medium">Dashboard</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-primary-foreground/20" />
                                            <div className="w-2 h-2 rounded-full bg-primary-foreground/20" />
                                            <div className="w-2 h-2 rounded-full bg-primary-foreground/20" />
                                        </div>
                                    </div>

                                    <div className="p-4 grid grid-cols-3 gap-3">
                                        <div className="bg-accent/10 rounded-lg p-3 text-center">
                                            <p className="text-xs text-muted-foreground">Today's Sales</p>
                                            <p className="text-lg font-bold text-foreground mt-1">GH₵ 2,450</p>
                                            <p className="text-xs text-accent font-medium">↑ 12%</p>
                                        </div>
                                        <div className="bg-primary/5 rounded-lg p-3 text-center">
                                            <p className="text-xs text-muted-foreground">Items Sold</p>
                                            <p className="text-lg font-bold text-foreground mt-1">34</p>
                                            <p className="text-xs text-primary font-medium">↑ 8%</p>
                                        </div>
                                        <div className="bg-muted rounded-lg p-3 text-center">
                                            <p className="text-xs text-muted-foreground">Profit</p>
                                            <p className="text-lg font-bold text-foreground mt-1">GH₵ 890</p>
                                            <p className="text-xs text-accent font-medium">↑ 15%</p>
                                        </div>
                                    </div>

                                    {/* Mini chart */}
                                    <div className="px-4 pb-4">
                                        <div className="bg-muted/30 rounded-lg p-4 h-32 flex items-end gap-1.5">
                                            {[35, 55, 45, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-primary/20 rounded-t-sm relative overflow-hidden"
                                                    style={{ height: `${h}%` }}
                                                >
                                                    <div
                                                        className="absolute bottom-0 inset-x-0 bg-primary rounded-t-sm origin-bottom animate-grow-up"
                                                        style={{ height: "100%", animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recent sales */}
                                    <div className="px-4 pb-4 space-y-2">
                                        {[
                                            { label: "Rice (50kg)", amount: "GH₵ 350", time: "2min ago" },
                                            { label: "Cooking Oil x3", amount: "GH₵ 195", time: "15min ago" },
                                            { label: "Sugar (25kg)", amount: "GH₵ 180", time: "1hr ago" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 border-t border-border/50">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                                                    <p className="text-xs text-muted-foreground">{item.time}</p>
                                                </div>
                                                <p className="text-sm font-semibold text-accent">{item.amount}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Floating: sales up */}
                                <div className="absolute -top-4 -right-4 md:-right-8 bg-card rounded-xl shadow-lg border border-border/50 p-3 animate-float">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">Sales up 23%</p>
                                            <p className="text-[10px] text-muted-foreground">vs last week</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating: low stock */}
                                <div
                                    className="absolute -bottom-3 -left-4 md:-left-8 bg-card rounded-xl shadow-lg border border-border/50 p-3 animate-float"
                                    style={{ animationDelay: "1s" }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                                            <Package className="w-4 h-4 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">Low stock alert</p>
                                            <p className="text-[10px] text-muted-foreground">Cooking Oil: 3 left</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== STATS BAR ==================== */}
            <section ref={statsSection.ref} className="border-y border-border/50 bg-muted/30">
                <div
                    className={`max-w-[1200px] mx-auto px-6 py-12 md:py-16 transition-all duration-700 ${statsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                        }`}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-3xl md:text-4xl font-bold text-foreground">
                                    <AnimatedCounter end={stat.value} suffix={stat.suffix} decimals={stat.value % 1 !== 0 ? 1 : 0} />
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== FEATURES ==================== */}
            <section ref={featuresSection.ref} className="py-20 md:py-28 px-6">
                <div className="max-w-[1200px] mx-auto">
                    <div
                        className={`text-center mb-14 transition-all duration-700 ${featuresSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                            }`}
                    >
                        <p className="text-sm font-semibold tracking-widest uppercase text-accent mb-4">Everything you need</p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                            Built for businesses on the rise
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            From market stalls to growing shops, Tralo gives you the tools to track, manage, and grow — without the complexity.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={i}
                                    className={`group relative bg-card rounded-2xl border border-border/50 p-6 md:p-8 hover:shadow-lg hover:border-border transition-all duration-500 hover:-translate-y-1 ${featuresSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                        }`}
                                    style={{ transitionDelay: featuresSection.isInView ? `${i * 100}ms` : "0ms" }}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ==================== HOW IT WORKS ==================== */}
            <section ref={stepsSection.ref} className="py-20 md:py-28 px-6 bg-muted/30">
                <div className="max-w-[1200px] mx-auto">
                    <div
                        className={`text-center mb-14 transition-all duration-700 ${stepsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                            }`}
                    >
                        <p className="text-sm font-semibold tracking-widest uppercase text-accent mb-4">Simple setup</p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                            Up and running in minutes
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
                        {/* Connecting line (desktop) */}
                        <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-border" />

                        {steps.map((step, i) => (
                            <div
                                key={i}
                                className={`relative text-center transition-all duration-700 ${stepsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                    }`}
                                style={{ transitionDelay: stepsSection.isInView ? `${i * 200}ms` : "0ms" }}
                            >
                                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-xl font-bold mb-6 shadow-lg z-10">
                                    {step.number}
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== APP SHOWCASE ==================== */}
            <section ref={previewSection.ref} className="py-20 md:py-28 px-6 overflow-hidden">
                <div className="max-w-[1200px] mx-auto">
                    <div
                        className={`text-center mb-14 transition-all duration-700 ${previewSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                            }`}
                    >
                        <p className="text-sm font-semibold tracking-widest uppercase text-accent mb-4">See it in action</p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                            Your business, at a glance
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                            Everything you need is one tap away. Designed for speed on any device.
                        </p>
                    </div>

                    {/* Phone mockup */}
                    <div
                        className={`relative max-w-sm mx-auto transition-all duration-1000 ${previewSection.isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"
                            }`}
                    >
                        <div className="relative bg-foreground rounded-[2.5rem] p-3 shadow-2xl">
                            <div className="bg-card rounded-[2rem] overflow-hidden">
                                {/* Status bar */}
                                <div className="bg-primary px-5 py-2 flex items-center justify-between">
                                    <span className="text-primary-foreground/70 text-xs">9:41</span>
                                    <div className="flex gap-1">
                                        <div className="w-4 h-2 rounded-sm bg-primary-foreground/50" />
                                        <div className="w-1.5 h-2 rounded-sm bg-primary-foreground/30" />
                                    </div>
                                </div>

                                {/* App header */}
                                <div className="bg-primary px-5 pb-4 pt-2">
                                    <p className="text-primary-foreground text-lg font-bold">Good morning, Kofi 👋</p>
                                    <p className="text-primary-foreground/70 text-sm">Here's your business today</p>
                                </div>

                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-accent/10 rounded-xl p-3">
                                            <p className="text-xs text-muted-foreground">Revenue</p>
                                            <p className="text-xl font-bold text-foreground">GH₵ 4,200</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-12 h-1 bg-accent rounded-full" />
                                                <span className="text-[10px] text-accent font-medium">+18%</span>
                                            </div>
                                        </div>
                                        <div className="bg-primary/5 rounded-xl p-3">
                                            <p className="text-xs text-muted-foreground">Orders</p>
                                            <p className="text-xl font-bold text-foreground">47</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-8 h-1 bg-primary rounded-full" />
                                                <span className="text-[10px] text-primary font-medium">+5%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/50 rounded-xl p-3">
                                        <p className="text-xs font-medium text-foreground mb-2">This Week</p>
                                        <div className="flex items-end gap-1 h-16">
                                            {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 rounded-t-sm"
                                                    style={{
                                                        height: `${h}%`,
                                                        background: i === 6 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.2)",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                                <span key={i} className="text-[9px] text-muted-foreground flex-1 text-center">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { icon: Receipt, label: "Sale", color: "bg-accent/10 text-accent" },
                                            { icon: Package, label: "Stock", color: "bg-primary/10 text-primary" },
                                            { icon: FileText, label: "Invoice", color: "bg-blue-500/10 text-blue-600" },
                                            { icon: BarChart3, label: "Reports", color: "bg-orange-500/10 text-orange-600" },
                                        ].map((action, i) => {
                                            const ActionIcon = action.icon;
                                            return (
                                                <div key={i} className="flex flex-col items-center gap-1">
                                                    <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                                                        <ActionIcon className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">{action.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Glow behind phone */}
                        <div className="absolute inset-0 -z-10 bg-primary/10 rounded-full blur-3xl scale-75" />
                    </div>
                </div>
            </section>

            {/* ==================== TESTIMONIALS ==================== */}
            <section ref={testimonialsSection.ref} className="py-20 md:py-28 px-6 bg-muted/30">
                <div className="max-w-[1200px] mx-auto">
                    <div
                        className={`text-center mb-14 transition-all duration-700 ${testimonialsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                            }`}
                    >
                        <p className="text-sm font-semibold tracking-widest uppercase text-accent mb-4">Trusted by traders</p>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                            Hear from businesses like yours
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                        {testimonials.map((testimonial, i) => (
                            <div
                                key={i}
                                className={`bg-card rounded-2xl border border-border/50 p-6 md:p-8 transition-all duration-700 hover:shadow-lg ${testimonialsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                    }`}
                                style={{ transitionDelay: testimonialsSection.isInView ? `${i * 150}ms` : "0ms" }}
                            >
                                <div className="flex gap-1 mb-4">
                                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-foreground leading-relaxed mb-6 italic">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                        {testimonial.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                                        <p className="text-xs text-muted-foreground">{testimonial.business}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ==================== FINAL CTA ==================== */}
            <section ref={ctaSection.ref} className="py-20 md:py-28 px-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
                </div>

                <div
                    className={`relative max-w-3xl mx-auto text-center transition-all duration-700 ${ctaSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                        }`}
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                        Ready to take control of your business?
                    </h2>
                    <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Join thousands of businesses across Ghana already using Tralo to track, manage, and grow. Start today — it's completely free.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/auth">
                            <Button
                                size="lg"
                                className="group px-10 py-6 text-lg rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                            >
                                <span className="flex items-center gap-2">
                                    Start for free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Button>
                        </Link>
                        <Link to="/contact">
                            <Button
                                variant="outline"
                                size="lg"
                                className="px-10 py-6 text-lg rounded-xl font-semibold border-2 hover:bg-muted/50 transition-all"
                            >
                                Talk to us
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-muted-foreground/60">
                        No credit card · No commitment · Cancel anytime
                    </p>
                </div>
            </section>
        </Layout>
    );
};

export default Landing;
