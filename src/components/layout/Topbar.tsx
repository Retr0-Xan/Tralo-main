import { Fragment, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Menu, PlusCircle, BellRing, LogOut, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TopbarProps {
    onMenuClick: () => void;
}

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
    const { toast } = useToast();

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
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 sm:gap-4 px-3 py-3 sm:px-6 sm:py-4 lg:px-10">
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="ml-1 h-10 w-10 cursor-pointer border border-border/70">
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground">{user?.user_metadata?.owner_name ?? user?.email}</span>
                                        <span className="text-xs text-muted-foreground">Signed in</span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={async () => {
                                        const { error } = await supabase.auth.signOut();
                                        if (error) {
                                            toast({
                                                title: "Error",
                                                description: "Failed to log out. Please try again.",
                                                variant: "destructive",
                                            });
                                            return;
                                        }

                                        toast({
                                            title: "Logged Out",
                                            description: "You have been signed out.",
                                        });

                                        navigate("/auth");
                                    }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

            </div>
        </header>
    );
};
