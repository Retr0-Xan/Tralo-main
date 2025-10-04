import { Home, Package, Receipt, TrendingUp, FileText, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  const navItems = [
    { id: "home", label: "Homepage", icon: Home, path: "/" },
    { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
    { id: "sales", label: "Sales", icon: Receipt, path: "/sales" },
    { id: "trade-index", label: "Trade Index", icon: TrendingUp, path: "/trade-index" },
    { id: "documents", label: "Documents", icon: FileText, path: "/documents" },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    setActiveTab(item.id);
    navigate(item.path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navigation;