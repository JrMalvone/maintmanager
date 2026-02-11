import { Link, useLocation } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { cn } from "@/lib/utils";
import { AppRole } from "@/lib/auth";
import {
  Wrench,
  ClipboardPlus,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  {
    label: "Nova Ordem",
    href: "/dashboard/new-order",
    icon: ClipboardPlus,
    roles: ["operador", "manutencao", "gestor"],
  },
  {
    label: "Ordens de Serviço",
    href: "/dashboard/orders",
    icon: ClipboardList,
    roles: ["manutencao", "gestor"],
  },
  {
    label: "Dashboard",
    href: "/dashboard/analytics",
    icon: BarChart3,
    roles: ["gestor"],
  },
  {
    label: "Configurações",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["gestor"],
  },
];

export function Sidebar() {
  const { user, roleDisplayName, role, logout } = useAppAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">CMMS</h1>
          <p className="text-xs text-muted-foreground">Manutenção Industrial</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                isActive ? "nav-item-active" : "nav-item-inactive"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user || "Usuário"}</p>
            <p className="text-xs text-muted-foreground">
              {roleDisplayName || "Carregando..."}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full pt-16">{sidebarContent}</div>
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
}
