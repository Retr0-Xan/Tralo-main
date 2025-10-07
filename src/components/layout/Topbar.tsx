import { Fragment, useMemo } from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Menu, PlusCircle, BellRing } from "lucide-react";

interface TopbarProps {
    onMenuClick: () => void;
}

interface RouteMeta {
    path: string;
    title: string;
    description: string;
}

const ROUTE_META: RouteMeta[] = [
    { path: "/", title: "Operations Dashboard", description: "Monitor sales, stock, and trust score in real time." },
    { path: "/inventory", title: "Inventory Control", description: "Track stock movements, replenishment status, and valuations." },
    { path: "/sales", title: "Sales Management", description: "Capture transactions, analyse performance, and review summaries." },
    { path: "/trade-index", title: "Trade Index", description: "Follow sector insights and market watchlists for better decisions." },
    { path: "/documents", title: "Document Workspace", description: "Generate and manage invoices, receipts, and business records." },
    { path: "/reminders", title: "Business Reminders", description: "Stay ahead with scheduled follow-ups and task alerts." },
    { path: "/profile", title: "Business Profile", description: "Update your brand presence, contact details, and highlights." },
    { path: "/customer-purchase", title: "Customer Portal", description: "Review shared purchase experiences and QR workflows." },
    { path: "/purchase", title: "Quick Purchase", description: "Record walk-in transactions and issue receipts instantly." },
];

const getRouteMeta = (pathname: string): RouteMeta => {
    for (const meta of ROUTE_META) {
        if (matchPath({ path: meta.path, end: meta.path === "/" }, pathname)) {
            return meta;
        }
    }

    return {
        path: pathname,
        title: "Workspace",
        description: "Navigate your business modules and reports.",
    };
};

const buildBreadcrumbs = (pathname: string) => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [
        { label: "Home", path: "/" },
    ];

    if (segments.length === 0) {
        return crumbs;
    }

    let cumulativePath = "";
    segments.forEach((segment) => {
        cumulativePath += `/${segment}`;
        crumbs.push({
            label: segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase()),
            path: cumulativePath,
        });
    });

    return crumbs;
};

export const Topbar = ({ onMenuClick }: TopbarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const metadata = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
    const breadcrumbs = useMemo(() => buildBreadcrumbs(location.pathname), [location.pathname]);

    const initials = user?.user_metadata?.owner_name
        ? user.user_metadata.owner_name
            .split(" ")
            .map((part: string) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join("")
        : user?.email?.slice(0, 2).toUpperCase() ?? "TR";

    return (
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-border/70 text-foreground lg:hidden"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="min-w-0 flex-1">
                        <Breadcrumb>
                            <BreadcrumbList>
                                {breadcrumbs.map((crumb, index) => (
                                    <Fragment key={crumb.path}>
                                        {index > 0 && <BreadcrumbSeparator />}
                                        {index < breadcrumbs.length - 1 ? (
                                            <BreadcrumbItem>
                                                <BreadcrumbLink href={crumb.path}>{crumb.label}</BreadcrumbLink>
                                            </BreadcrumbItem>
                                        ) : (
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        )}
                                    </Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                                    {metadata.title}
                                </h1>
                                <p className="text-xs text-muted-foreground md:text-sm">{metadata.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden min-w-[220px] max-w-sm flex-1 items-center gap-2 md:flex">
                        <Input
                            placeholder="Search modules, documents, or customers"
                            className="rounded-xl border-border/70 bg-background/70"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden rounded-xl border-border/70 text-sm font-medium md:inline-flex"
                            onClick={() => navigate("/sales")}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Transaction
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground">
                            <BellRing className="h-5 w-5" />
                            <span className="sr-only">Notifications</span>
                        </Button>
                        <ThemeToggle />
                        <Avatar className="ml-1 h-10 w-10 border border-border/70">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                <div className="md:hidden">
                    <Input
                        placeholder="Search modules, documents, or customers"
                        className="rounded-xl border-border/70 bg-background/70"
                    />
                </div>
            </div>
        </header>
    );
};
