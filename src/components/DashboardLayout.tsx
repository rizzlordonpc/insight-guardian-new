import { NavLink } from "@/components/NavLink";
import { useLocation, Outlet } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, AlertTriangle, Shield, Activity, FileWarning, Menu, Building2, LogOut, Database } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAuth, useRole } from "@/lib/auth";

const navItems = [
  { title: "Threat Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Monitored Personnel", url: "/users", icon: Users },
  { title: "Alert Explorer", url: "/alerts", icon: AlertTriangle },
  { title: "Access Database", url: "/access-db", icon: Database },
  { title: "Activity Logs", url: "/activity", icon: Activity },
  { title: "Decoy Assets", url: "/decoys", icon: FileWarning },
];

export default function DashboardLayout() {
  const location = useLocation();
  const { orgName } = useAppStore();
  const { user, logout } = useAuth();
  const { role } = useRole();

  const segment = location.pathname === "/dashboard" ? "THREAT OVERVIEW" : location.pathname.slice(1).toUpperCase().replace('/', ' ');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-border">
          <SidebarContent>
            <div className="px-4 py-5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground tracking-tight">INSIGHT-GUARDIAN</h1>
                <p className="text-[10px] text-muted-foreground font-mono tracking-wider">SOC CONSOLE</p>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase px-4">
                Monitoring
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-secondary rounded-md"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Operator info + sign out */}
            <div className="mt-auto p-4 space-y-3">
              <div className="rounded-lg bg-secondary/50 p-3 border border-border">
                <p className="text-[10px] font-mono text-muted-foreground">OPERATOR</p>
                <p className="text-xs font-medium text-foreground mt-0.5 truncate">{user?.name}</p>
                <p className="text-[10px] font-mono text-primary mt-0.5">{role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-border"
              >
                <LogOut className="h-3.5 w-3.5" />
                End Session
              </button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{segment}</span>
                <span className="text-xs text-muted-foreground/40">|</span>
                <span className="text-xs font-mono text-primary animate-pulse-glow">● LIVE</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50 border border-border">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-mono font-medium text-foreground">{orgName}</span>
              </div>
              <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground">
                {new Date().toLocaleTimeString('en-US', { hour12: false })} UTC
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6 grid-pattern">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
