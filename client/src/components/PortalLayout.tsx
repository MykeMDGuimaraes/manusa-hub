import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  LayoutDashboard,
  Video,
  Eye,
  Settings2,
  LogOut,
  Zap,
  ChevronRight,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "DiaDash — Meta Ads" },
  { href: "/gerador", label: "Gerador de Conteúdo", icon: Video, desc: "Criação de Reels" },
  { href: "/supervisao", label: "Supervisão Manusa", icon: Eye, desc: "Pipeline de conteúdo" },
  { href: "/rotinas", label: "Controle de Rotinas", icon: Settings2, desc: "Automações e parâmetros" },
  { href: "/olimpo", label: "Saúde do Olimpo", icon: Activity, desc: "Operadores e workflows" },
];

function ManusaStatusDot() {
  const { data } = trpc.manusa.status.useQuery(undefined, {
    refetchInterval: 30000,
    retry: false,
  });

  const online = data?.online ?? false;
  const label = online
    ? `Online · ${data?.rotinasAtivas}/${data?.totalRotinas} rotinas ativas`
    : "Offline";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
      <div className={online ? "manusa-online" : "manusa-offline"} />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Manusa
        </span>
        <span className={cn("text-xs font-medium truncate", online ? "text-green-400" : "text-red-400")}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-8 rounded-xl border border-border bg-card max-w-sm w-full mx-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Manusa Hub</h1>
              <p className="text-xs text-muted-foreground">Dia Solutions</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Faça login para acessar o painel de gestão de conteúdo e tráfego.
          </p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>Entrar com Manus</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate">Manusa Hub</p>
              <p className="text-[10px] text-muted-foreground">Dia Solutions</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                  </div>
                  {active && <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Ferramentas</p>
          <div className="space-y-1">
            {[
              { label: "n8n — Workflows", href: "https://n8n.io", color: "text-orange-400" },
              { label: "Mike — Supabase", href: "https://supabase.com", color: "text-green-400" },
              { label: "ClickUp", href: "https://clickup.com", color: "text-purple-400" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors group"
              >
                <ExternalLink className={`w-3 h-3 flex-shrink-0 ${link.color}`} />
                <span className={`text-xs truncate ${link.color}`}>{link.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom: Status + User */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
          <ManusaStatusDot />
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "Usuário"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
