import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Store,
  LogOut,
  Menu,
  X,
  Wallet,
  Shield,
  ClipboardList,
  Smartphone,
  FileText,
  ShoppingBag,
  MessageCircle,
  Star,
  Truck,
  Megaphone
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";
import logoUrl from "@assets/kado-logo.jpg";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "merchant" | "admin";
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const merchantLinks = [
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/dashboard/products", label: "المنتجات", icon: Package },
    { href: "/dashboard/orders", label: "الطلبات", icon: ShoppingBag },
    { href: "/dashboard/reviews", label: "التقييمات", icon: Star },
    { href: "/dashboard/messages", label: "الرسائل", icon: MessageCircle },
    { href: "/dashboard/wallet", label: "المحفظة", icon: Wallet },
    { href: "/dashboard/delivery", label: "التوصيل والفروع", icon: Truck },
    { href: "/dashboard/settings", label: "إعدادات المتجر", icon: Settings },
  ];

  const adminLinks = [
    { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
    { href: "/admin/pending", label: "طلبات التسجيل", icon: ClipboardList },
    { href: "/admin/merchants", label: "التجار", icon: Store },
    { href: "/admin/customers", label: "العملاء", icon: Users },
    { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
    { href: "/admin/withdrawals", label: "المحافظ والسحب", icon: Wallet },
    { href: "/admin/app-settings", label: "إعدادات التطبيق", icon: Smartphone },
    { href: "/admin/promotions", label: "الإعلانات الترويجية", icon: Megaphone },
    { href: "/admin/policies", label: "السياسات والشروط", icon: FileText },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  ];

  const links = role === "admin" ? adminLinks : merchantLinks;

  return (
    <div className="min-h-screen bg-muted/10 flex" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-64 bg-sidebar border-l border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex md:flex-col shadow-xl md:shadow-none",
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3 font-bold text-xl text-sidebar-primary">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sidebar-primary/20">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display text-foreground">KADO</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mr-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer group">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">أحمد محمد</p>
              <p className="text-xs text-muted-foreground truncate">
                {role === 'admin' ? 'مدير النظام' : 'متجر الأناقة'}
              </p>
            </div>
            <Link href="/">
              <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 md:px-8 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -mr-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-4 mr-auto">
            <NotificationBell role={role} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
