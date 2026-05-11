import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Clock,
  Play,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Rotinas ─────────────────────────────────────────────────────────────────

function RotinaCard({ rotina }: { rotina: any }) {
  const utils = trpc.useUtils();
  const [executando, setExecutando] = useState(false);

  const toggle = trpc.rotinas.toggle.useMutation({
    onSuccess: () => utils.rotinas.list.invalidate(),
    onError: (e) => toast.error(`Erro ao alterar rotina: ${e.message}`),
  });

  const executar = trpc.rotinas.executarAgora.useMutation({
    onSuccess: () => {
      toast.success(`Rotina "${rotina.nome}" iniciada com sucesso!`);
      utils.rotinas.list.invalidate();
      utils.acoes.list.invalidate();
      setExecutando(false);
    },
    onError: (e) => {
      toast.error(`Erro ao executar: ${e.message}`);
      setExecutando(false);
    },
  });

  const handleExecutar = () => {
    setExecutando(true);
    executar.mutate({ slug: rotina.slug, taskId: rotina.taskId });
  };

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 flex flex-col gap-4 transition-all",
      rotina.ativa ? "border-border" : "border-border/40 opacity-60"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-sm">{rotina.nome}</h3>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium border",
              rotina.ativa
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}>
              {rotina.ativa ? "Ativa" : "Pausada"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{rotina.descricao}</p>
        </div>
        <Switch
          checked={rotina.ativa}
          onCheckedChange={(v) => toggle.mutate({ slug: rotina.slug, ativa: v })}
          disabled={toggle.isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{rotina.frequencia ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Última: {formatDate(rotina.ultimaExecucao)}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 gap-2"
        onClick={handleExecutar}
        disabled={executando || executar.isPending}
      >
        {executando || executar.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        Executar agora
      </Button>
    </div>
  );
}

// ─── Parâmetros ───────────────────────────────────────────────────────────────

const ICP_LABELS: Record<string, string> = {
  saude: "Saúde",
  mentor: "Mentor",
  b2b: "B2B",
};

function ParamsPanel() {
  const { data: params, isLoading } = trpc.params.list.useQuery();
  const utils = trpc.useUtils();
  const [editando, setEditando] = useState<Record<string, Record<string, string>>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const update = trpc.params.update.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Parâmetros de ${ICP_LABELS[vars.icp]} salvos!`);
      utils.params.list.invalidate();
      setSalvando(null);
    },
    onError: (e) => {
      toast.error(`Erro ao salvar: ${e.message}`);
      setSalvando(null);
    },
  });

  const getValue = (icp: string, field: string, fallback: string) =>
    editando[icp]?.[field] ?? fallback;

  const setValue = (icp: string, field: string, value: string) =>
    setEditando((prev) => ({
      ...prev,
      [icp]: { ...(prev[icp] ?? {}), [field]: value },
    }));

  const handleSave = (p: any) => {
    setSalvando(p.icp);
    update.mutate({
      icp: p.icp,
      cplMeta: getValue(p.icp, "cplMeta", p.cplMeta),
      cplTeto: getValue(p.icp, "cplTeto", p.cplTeto),
      ctrMinimo: getValue(p.icp, "ctrMinimo", p.ctrMinimo),
      orcamentoMaxDia: getValue(p.icp, "orcamentoMaxDia", p.orcamentoMaxDia),
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {(params ?? []).map((p) => (
        <div key={p.icp} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">ICP: {ICP_LABELS[p.icp]}</h4>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.icp}</span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPL Meta (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getValue(p.icp, "cplMeta", p.cplMeta)}
                  onChange={(e) => setValue(p.icp, "cplMeta", e.target.value)}
                  className="h-8 text-sm bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPL Teto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getValue(p.icp, "cplTeto", p.cplTeto)}
                  onChange={(e) => setValue(p.icp, "cplTeto", e.target.value)}
                  className="h-8 text-sm bg-input border-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CTR mínimo (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={getValue(p.icp, "ctrMinimo", p.ctrMinimo)}
                  onChange={(e) => setValue(p.icp, "ctrMinimo", e.target.value)}
                  className="h-8 text-sm bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Orçamento máx/dia (R$)</Label>
                <Input
                  type="number"
                  step="1"
                  value={getValue(p.icp, "orcamentoMaxDia", p.orcamentoMaxDia)}
                  onChange={(e) => setValue(p.icp, "orcamentoMaxDia", e.target.value)}
                  className="h-8 text-sm bg-input border-border"
                />
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => handleSave(p)}
            disabled={salvando === p.icp}
          >
            {salvando === p.icp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Salvar Parâmetros
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Histórico de Ações ───────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = { A1: "A1", A2: "A2", A3: "A3" };
const STATUS_LABELS: Record<string, string> = {
  executada: "Executada",
  aguardando_ok: "Aguardando OK",
  pendente_aprovacao: "Pendente aprovação",
  rejeitada: "Rejeitada",
};

function AcoesTable() {
  const [filtroTipo, setFiltroTipo] = useState<"A1" | "A2" | "A3" | undefined>();
  const [filtroCampanha, setFiltroCampanha] = useState("");
  const utils = trpc.useUtils();

  const queryInput: any = { limit: 100 };
  if (filtroTipo) queryInput.tipo = filtroTipo;
  if (filtroCampanha.trim()) queryInput.campanha = filtroCampanha.trim();

  const { data: acoes, isLoading, refetch } = trpc.acoes.list.useQuery(
    queryInput,
    { refetchInterval: 60000 }
  );

  const formatDate = (d: Date) =>
    new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <Input
            placeholder="Campanha..."
            value={filtroCampanha}
            onChange={(e) => setFiltroCampanha(e.target.value)}
            className="h-7 w-36 text-xs bg-input border-border"
          />
          {(["A1", "A2", "A3"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(filtroTipo === t ? undefined : t)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md border font-semibold transition-colors",
                filtroTipo === t
                  ? t === "A1" ? "badge-a1" : t === "A2" ? "badge-a2" : "badge-a3"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {t}
            </button>
          ))}
          {filtroTipo && (
            <button
              onClick={() => setFiltroTipo(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpar
            </button>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campanha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : (acoes ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhuma ação registrada.
                </td>
              </tr>
            ) : (
              (acoes ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.criadoEm)}</td>
                  <td className="px-4 py-3">
                    <span className={a.tipo === "A1" ? "badge-a1" : a.tipo === "A2" ? "badge-a2" : "badge-a3"}>
                      {a.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground max-w-xs truncate">{a.descricao}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{a.campanha ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={
                      a.status === "executada" ? "badge-executada" :
                      a.status === "aguardando_ok" ? "badge-aguardando" :
                      a.status === "pendente_aprovacao" ? "badge-pendente" : "badge-rejeitada"
                    }>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function RotinasPage() {
  const { data: rotinas, isLoading } = trpc.rotinas.list.useQuery(undefined, {
    refetchInterval: 30000,
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Controle de Rotinas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as automações da Manusa, ajuste parâmetros e acompanhe o histórico de ações.
        </p>
      </div>

      {/* Rotinas */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Rotinas Agendadas
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(rotinas ?? []).map((r) => (
              <RotinaCard key={r.slug} rotina={r} />
            ))}
          </div>
        )}
      </section>

      {/* Parâmetros */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Parâmetros por ICP
        </h2>
        <ParamsPanel />
      </section>

      {/* Histórico de Ações */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Histórico de Ações
        </h2>
        <AcoesTable />
      </section>
    </div>
  );
}
