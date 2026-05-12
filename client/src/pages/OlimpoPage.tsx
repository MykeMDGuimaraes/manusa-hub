import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Zap,
  Scale,
  Sword,
  Wrench,
  Bot,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  online:       { label: "Online",      color: "text-green-400",  bg: "bg-green-500/15 border-green-500/30",  icon: CheckCircle2 },
  ok:           { label: "OK",          color: "text-green-400",  bg: "bg-green-500/15 border-green-500/30",  icon: CheckCircle2 },
  offline:      { label: "Offline",     color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",      icon: XCircle },
  erro:         { label: "Erro",        color: "text-red-400",    bg: "bg-red-500/15 border-red-500/30",      icon: XCircle },
  degradado:    { label: "Degradado",   color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: AlertTriangle },
  pendente:     { label: "Pendente",    color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: AlertTriangle },
  desconhecido: { label: "Desconhecido",color: "text-muted-foreground", bg: "bg-muted/50 border-border",      icon: HelpCircle },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.desconhecido;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

const OPERADOR_ICONS: Record<string, React.ElementType> = {
  themis: Scale,
  ares:   Sword,
  manusa: Zap,
  jhon:   Wrench,
  sistema: Bot,
};

const OPERADOR_COLORS: Record<string, string> = {
  themis: "text-purple-400 bg-purple-500/15",
  ares:   "text-orange-400 bg-orange-500/15",
  manusa: "text-blue-400 bg-blue-500/15",
  jhon:   "text-cyan-400 bg-cyan-500/15",
  sistema:"text-muted-foreground bg-muted/50",
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Operadores ───────────────────────────────────────────────────────────────

function OperadoresGrid() {
  const { data: operadores, isLoading } = trpc.olimpo.operadores.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 h-36 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {(operadores ?? []).map((op) => {
        const Icon = OPERADOR_ICONS[op.slug] ?? Bot;
        const colorClass = OPERADOR_COLORS[op.slug] ?? OPERADOR_COLORS.sistema;
        return (
          <div key={op.slug} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <StatusBadge status={op.status} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{op.nome}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{op.papel}</p>
            </div>
            <div className="space-y-1 pt-1 border-t border-border/50">
              {op.cerebro && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-foreground/60 font-medium">Cérebro:</span> {op.cerebro}
                </p>
              )}
              {op.camada && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-foreground/60 font-medium">Camada:</span> {op.camada}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Workflows ────────────────────────────────────────────────────────────────

function WorkflowsTable() {
  const { data: workflows, isLoading } = trpc.olimpo.workflows.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) return (
    <div className="space-y-2">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
      ))}
    </div>
  );

  const total = workflows?.length ?? 0;
  const ativos = workflows?.filter((w) => w.ativo).length ?? 0;
  const comErro = workflows?.filter((w) => w.ultimoStatus === "erro").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{ativos}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativos</p>
        </div>
        <div className={cn("rounded-lg border p-3 text-center",
          comErro > 0 ? "border-red-500/30 bg-red-500/10" : "border-border bg-card"
        )}>
          <p className={cn("text-2xl font-bold", comErro > 0 ? "text-red-400" : "text-muted-foreground")}>{comErro}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Com erro</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workflow</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Operador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Cadência</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Última execução</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {(workflows ?? []).map((wf, i) => {
              const Icon = OPERADOR_ICONS[wf.operador] ?? Bot;
              const colorClass = OPERADOR_COLORS[wf.operador] ?? OPERADOR_COLORS.sistema;
              return (
                <tr
                  key={wf.workflowId}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-muted/20",
                    i === (workflows?.length ?? 0) - 1 && "border-b-0"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-medium text-foreground text-sm">{wf.nome}</p>
                      {wf.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">{wf.descricao}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md", colorClass)}>
                      <Icon className="w-3 h-3" />
                      {wf.operador.charAt(0).toUpperCase() + wf.operador.slice(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {wf.cadencia ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(wf.ultimaExecucao)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={wf.ultimoStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Links Externos ───────────────────────────────────────────────────────────

const EXTERNAL_LINKS = [
  {
    label: "n8n — Automações",
    desc: "Gerenciador de workflows do Olimpo",
    href: "https://n8n.io",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40",
  },
  {
    label: "Mike — Supabase",
    desc: "Banco de dados e memória do Olimpo",
    href: "https://supabase.com",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20 hover:border-green-500/40",
  },
  {
    label: "ClickUp — Tarefas",
    desc: "Gestão de projetos e aprovações",
    href: "https://clickup.com",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
  },
  {
    label: "Meta Ads Manager",
    desc: "Gerenciador de anúncios da Dia Solutions",
    href: "https://business.facebook.com",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
  },
];

function LinksExternos() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {EXTERNAL_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-xl border p-4 flex flex-col gap-2 transition-all cursor-pointer",
            link.bg
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-semibold", link.color)}>{link.label}</span>
            <ExternalLink className={cn("w-3.5 h-3.5 flex-shrink-0", link.color)} />
          </div>
          <p className="text-xs text-muted-foreground">{link.desc}</p>
        </a>
      ))}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function OlimpoPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Saúde do Olimpo</h1>
              <p className="text-sm text-muted-foreground">Themis Editorial Bridge v1.0 — Go-live: 12/05/2026</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-3">
            Visão consolidada dos 4 operadores e 7 workflows do ecossistema Dia Solutions. 
            Os dados são atualizados automaticamente a cada 60 segundos.
          </p>
        </div>

        {/* Operadores */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full inline-block" />
            Os 4 Operadores do Olimpo
          </h2>
          <OperadoresGrid />
        </section>

        {/* Workflows */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full inline-block" />
            7 Workflows Ativos
          </h2>
          <WorkflowsTable />
        </section>

        {/* Links Externos */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full inline-block" />
            Ferramentas do Ecossistema
          </h2>
          <LinksExternos />
        </section>

      </div>
    </div>
  );
}
