import { ReactNode, useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

interface AppShellProps {
    children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    useReminderNotifications();

    return (
        <div className="flex min-h-screen bg-muted/20 text-foreground">
            <SidebarNav isMobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
