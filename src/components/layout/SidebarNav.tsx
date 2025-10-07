import { Fragment } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Boxes,
    Receipt,
    ShoppingCart,
    LineChart,
    FileText,
    Bell,
    UsersRound,
    IdCard,
    HelpCircle,
    X,
    LucideIcon,
} from "lucide-react";
import TraloLogo from "../TraloLogo";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
    isMobileOpen: boolean;
    onClose: () => void;
}

type NavItem = {
    label: string;
    path: string;
    icon: LucideIcon;
    badge?: string;
};

const primaryNav: NavItem[] = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Inventory", path: "/inventory", icon: Boxes },
    { label: "Sales", path: "/sales", icon: Receipt },
    { label: "Purchasing", path: "/purchase", icon: ShoppingCart },
    { label: "Trade Index", path: "/trade-index", icon: LineChart },
    { label: "Documents", path: "/documents", icon: FileText },
    { label: "Reminders", path: "/reminders", icon: Bell },
];

const secondaryNav: NavItem[] = [
    { label: "Customer Portal", path: "/customer-purchase", icon: UsersRound },
    { label: "Profile & Branding", path: "/profile", icon: IdCard },
];

const renderNavGroup = (items: NavItem[]) => (
    <div className="space-y-1">
        {items.map((item) => {
            const Icon = item.icon;
            return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary/15 text-primary dark:bg-primary/60 dark:text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )
                    }
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 dark:bg-primary/40 dark:text-primary-foreground">
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary dark:bg-primary/60 dark:text-primary-foreground">{item.badge}</span>
                    )}
                </NavLink>
            );
        })}
    </div>
);

export const SidebarNav = ({ isMobileOpen, onClose }: SidebarNavProps) => {
    const content = (
        <Fragment>
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <TraloLogo />
                    <div className="leading-tight">
                        <p className="text-base font-semibold text-foreground">Tralo ERP</p>
                        <p className="text-xs text-muted-foreground">Unified business command center</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operations</p>
                        {renderNavGroup(primaryNav)}
                    </div>

                    <div>
                        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer & Settings</p>
                        {renderNavGroup(secondaryNav)}
                    </div>
                </div>

                <div className="mt-auto rounded-xl border border-dashed border-border/80 bg-background p-4">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                            <HelpCircle className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Need help?</p>
                            <p className="text-xs text-muted-foreground">Reach out to the Tralo team for onboarding and support.</p>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );

    return (
        <>
            <aside className="relative hidden w-72 flex-col border-r border-border/80 bg-background/95 px-4 py-6 shadow-sm lg:flex">
                {content}
            </aside>

            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
                    isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 border-r border-border/80 bg-background px-4 py-6 shadow-xl transition-transform duration-200 lg:hidden",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="mb-6 flex items-center justify-between px-2">
                    <TraloLogo />
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {content}
            </aside>
        </>
    );
};
