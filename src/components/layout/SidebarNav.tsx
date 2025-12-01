import { Fragment } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Boxes,
    Receipt,
    DollarSign,
    LineChart,
    FileText,
    Bell,
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
    { label: "Expenses", path: "/expenses", icon: DollarSign },
    { label: "Trade Index", path: "/trade-index", icon: LineChart },
    { label: "Documents", path: "/documents", icon: FileText },
    { label: "Reminders", path: "/reminders", icon: Bell },
];

const secondaryNav: NavItem[] = [
    { label: "Profile & Branding", path: "/profile", icon: IdCard },
];

export const SidebarNav = ({ isMobileOpen, onClose }: SidebarNavProps) => {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        navigate("/");
        onClose();
    };

    const renderNavGroup = (items: NavItem[]) => (
        <div className="space-y-1">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
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

    const content = (
        <Fragment>
            <div className="flex flex-col gap-6">
                <div className="px-2">
                    <button
                        onClick={handleLogoClick}
                        className="flex h-16 w-full items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <TraloLogo className="h-full w-full transform scale-[0.875] object-contain" />
                    </button>
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
                            <p className="text-xs text-muted-foreground">
                                Reach out at
                                <a
                                    href="mailto:info.traloapp@gmail.com"
                                    className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    info.traloapp@gmail.com
                                </a>
                                ‎ for onboarding and support.
                            </p>
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
                    <button onClick={handleLogoClick} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <TraloLogo />
                    </button>
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
