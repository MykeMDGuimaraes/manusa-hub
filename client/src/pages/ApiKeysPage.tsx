import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  RefreshCw,
} from "lucide-react";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPauta({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    recebida: { label: "Recebida", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    em_campanha: { label: "Em campanha", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
    publicada: { label: "Publicada", color: "bg-green-500/20 text-green-300 border-green-500/30" },
    pausada: { label: "Pausada", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    rejeitada: { label: "Rejeitada", color: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const s = map[status] ?? { label: status, color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function ApiKeysPage() {
  const utils = trpc.useUtils();

  // Queries
  const { data: keys = [], isLoading: loadingKeys, refetch: refetchKeys } = trpc.apiKeys.list.useQuery();
  const { data: pautas = [], isLoading: loadingPautas, refetch: refetchPautas } = trpc.themis.pautas.useQuery();

  // Mutations
  const createMut = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKeyRaw(data.rawKey);
      setShowCreatedModal(true);
      utils.apiKeys.list.invalidate();
      setShowCreateModal(false);
      setNewKeyName("");
      setNewKeyOwner("themis");
    },
    onError: (err) => {
      toast.error(`Erro ao criar key: ${err.message}`);
    },
  });

  const revokeMut = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      toast.success("API Key revogada com sucesso");
      utils.apiKeys.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro ao revogar key: ${err.message}`);
    },
  });

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyOwner, setNewKeyOwner] = useState("themis");
  const [newKeyRaw, setNewKeyRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(newKeyRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-400" />
            API Keys — Integração Themis
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gerencie as chaves de autenticação para o Themis se comunicar com o portal via REST, sem OAuth.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Gerar nova key
        </Button>
      </div>

      {/* Endpoints de referência */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Endpoints REST disponíveis para o Themis
        </h2>
        <div className="space-y-2 font-mono text-xs">
          {[
            { method: "POST", path: "/api/themis/pauta", desc: "Enviar pauta aprovada para Manusa" },
            { method: "GET", path: "/api/themis/status", desc: "Consultar status das rotinas" },
            { method: "POST", path: "/api/themis/feedback", desc: "Enviar feedback/recalibração de scores" },
          ].map((e) => (
            <div key={e.path} className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.method === "GET" ? "bg-green-500/20 text-green-300" : "bg-blue-500/20 text-blue-300"}`}>
                {e.method}
              </span>
              <code className="text-zinc-200">{e.path}</code>
              <span className="text-zinc-500">— {e.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-zinc-500 text-xs mt-3">
          Autenticação: header <code className="text-zinc-300">X-API-Key: &lt;sua_key&gt;</code>
        </p>
      </div>

      {/* Tabela de API Keys */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-200">Keys ativas</h2>
          <button
            onClick={() => refetchKeys()}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingKeys ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Nenhuma API key criada ainda. Clique em "Gerar nova key" para começar.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Prefixo</th>
                <th className="text-left px-5 py-3">Owner</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Último uso</th>
                <th className="text-left px-5 py-3">Criada em</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-200">{k.name}</td>
                  <td className="px-5 py-3 font-mono text-zinc-400 text-xs">{k.keyPrefix}…</td>
                  <td className="px-5 py-3 text-zinc-400">{k.owner}</td>
                  <td className="px-5 py-3">
                    {k.ativa ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Revogada
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(k.lastUsedAt)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{formatDate(k.createdAt)}</td>
                  <td className="px-5 py-3">
                    {k.ativa && (
                      <button
                        onClick={() => setRevokeTarget({ id: k.id, name: k.name })}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        title="Revogar key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pautas recebidas do Themis */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Pautas recebidas do Themis
          </h2>
          <button
            onClick={() => refetchPautas()}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingPautas ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Carregando...</div>
        ) : pautas.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            Nenhuma pauta recebida ainda. O Themis enviará pautas via{" "}
            <code className="text-zinc-300">POST /api/themis/pauta</code>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left px-5 py-3">Título</th>
                <th className="text-left px-5 py-3">Pilar</th>
                <th className="text-left px-5 py-3">ICP</th>
                <th className="text-left px-5 py-3">Modo</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Recebida em</th>
              </tr>
            </thead>
            <tbody>
              {pautas.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-200 max-w-xs truncate" title={p.titulo}>
                    {p.titulo}
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">{p.pilar ?? "—"}</td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">{p.icp ?? "—"}</td>
                  <td className="px-5 py-3 text-zinc-400 text-xs capitalize">{p.modoPublicacao ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusPauta status={p.status} />
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{formatDate(p.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Criar nova key */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-400" />
              Gerar nova API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-zinc-300 text-sm">Nome da key</Label>
              <Input
                className="mt-1.5 bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500"
                placeholder="Ex: Themis Bridge v1"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Owner</Label>
              <Input
                className="mt-1.5 bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-500"
                placeholder="themis"
                value={newKeyOwner}
                onChange={(e) => setNewKeyOwner(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-600 text-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={() => createMut.mutate({ name: newKeyName, owner: newKeyOwner })}
              disabled={!newKeyName.trim() || createMut.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMut.isPending ? "Gerando..." : "Gerar key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Key criada — exibir uma única vez */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              API Key gerada com sucesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-xs">
                Copie esta key agora. Ela não será exibida novamente por segurança — apenas o prefixo ficará visível na tabela.
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 font-mono text-sm text-zinc-200 break-all">
              {newKeyRaw}
            </div>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full border-zinc-600 text-zinc-300 gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar key
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCreatedModal(false)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar revogação */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Revogar API Key
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-300 text-sm py-2">
            Tem certeza que deseja revogar a key <strong className="text-white">{revokeTarget?.name}</strong>?
            Esta ação não pode ser desfeita. O Themis precisará de uma nova key para se autenticar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} className="border-zinc-600 text-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (revokeTarget) {
                  revokeMut.mutate({ id: revokeTarget.id });
                  setRevokeTarget(null);
                }
              }}
              disabled={revokeMut.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {revokeMut.isPending ? "Revogando..." : "Revogar key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
