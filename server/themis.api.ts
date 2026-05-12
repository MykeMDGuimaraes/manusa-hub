/**
 * Themis REST API — endpoints autenticados por API key
 * Permite que o Themis (e outros operadores) se comuniquem com a Manusa
 * sem precisar de OAuth. Rota base: /api/themis
 */
import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import {
  apiKeys,
  themisPautas,
  manusaAcoes,
  manusaRotinas,
  manusaParams,
} from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const themisRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function extractPrefix(raw: string): string {
  return raw.substring(0, 12);
}

/** Gera uma API key aleatória no formato: tmk_<32 hex chars> */
export function generateApiKey(): string {
  return "tmk_" + crypto.randomBytes(16).toString("hex");
}

// ─── Middleware de autenticação ──────────────────────────────────────────────

async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const rawKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (req.headers["x-api-key"] as string | undefined);

  if (!rawKey) {
    return res.status(401).json({ error: "API key obrigatória", code: "MISSING_KEY" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "Banco de dados indisponível", code: "DB_UNAVAILABLE" });
  }

  const keyHash = hashKey(rawKey);
  const [found] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.ativa, true)))
    .limit(1);

  if (!found) {
    return res.status(401).json({ error: "API key inválida ou revogada", code: "INVALID_KEY" });
  }

  // Atualiza lastUsedAt
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, found.id));

  (req as any).apiKeyOwner = found.owner;
  (req as any).apiKeyName = found.name;
  next();
}

// ─── GET /api/themis/status ──────────────────────────────────────────────────
// Retorna status das rotinas, parâmetros e últimas ações

themisRouter.get("/status", requireApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    const [rotinas, params, ultimasAcoes] = await Promise.all([
      db.select().from(manusaRotinas).orderBy(manusaRotinas.nome),
      db.select().from(manusaParams).orderBy(manusaParams.icp),
      db.select().from(manusaAcoes).orderBy(desc(manusaAcoes.criadoEm)).limit(10),
    ]);

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      rotinas: rotinas.map((r) => ({
        slug: r.slug,
        nome: r.nome,
        ativa: r.ativa,
        ultimaExecucao: r.ultimaExecucao,
        proximaExecucao: r.proximaExecucao,
      })),
      params,
      ultimasAcoes: ultimasAcoes.map((a) => ({
        tipo: a.tipo,
        descricao: a.descricao,
        campanha: a.campanha,
        status: a.status,
        criadoEm: a.criadoEm,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/themis/pauta ──────────────────────────────────────────────────
// Recebe pauta aprovada com classificação 4D do Themis

themisRouter.post("/pauta", requireApiKey, async (req: Request, res: Response) => {
  try {
    const {
      externalId,
      titulo,
      pilar,
      icp,
      faseTeia,
      ancora,
      textoAres,
      modoPublicacao,
      metadados,
    } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: "Campo 'titulo' é obrigatório", code: "MISSING_TITULO" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    // Verifica duplicata por externalId
    if (externalId) {
      const [existing] = await db
        .select()
        .from(themisPautas)
        .where(eq(themisPautas.externalId, externalId))
        .limit(1);
      if (existing) {
        return res.status(409).json({
          error: "Pauta já registrada com este externalId",
          code: "DUPLICATE",
          id: existing.id,
        });
      }
    }

    const [result] = await db.insert(themisPautas).values({
      externalId: externalId ?? null,
      titulo,
      pilar: pilar ?? null,
      icp: icp ?? null,
      faseTeia: faseTeia ?? null,
      ancora: ancora ?? null,
      textoAres: textoAres ?? null,
      modoPublicacao: modoPublicacao ?? "hibrido",
      status: "recebida",
      metadados: metadados ?? null,
    });

    // Registra ação A3 no histórico
    await db.insert(manusaAcoes).values({
      tipo: "A3",
      descricao: `Pauta recebida do Themis: "${titulo}"`,
      campanha: pilar ?? undefined,
      status: "pendente_aprovacao",
      metadados: { externalId, icp, faseTeia, ancora },
    });

    return res.status(201).json({
      ok: true,
      message: "Pauta registrada com sucesso",
      id: (result as any).insertId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/themis/recalibracao ──────────────────────────────────────────
// Themis envia ajustes de score/parâmetros após análise de performance

themisRouter.post("/recalibracao", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { icp, cplMeta, cplTeto, ctrMinimo, orcamentoMaxDia, observacao } = req.body;

    if (!icp) {
      return res.status(400).json({ error: "Campo 'icp' é obrigatório", code: "MISSING_ICP" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    const updates: Record<string, any> = {};
    if (cplMeta !== undefined) updates.cplMeta = String(cplMeta);
    if (cplTeto !== undefined) updates.cplTeto = String(cplTeto);
    if (ctrMinimo !== undefined) updates.ctrMinimo = String(ctrMinimo);
    if (orcamentoMaxDia !== undefined) updates.orcamentoMaxDia = String(orcamentoMaxDia);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum parâmetro para atualizar", code: "NO_UPDATES" });
    }

    await db.update(manusaParams).set(updates).where(eq(manusaParams.icp, icp as any));

    // Registra no histórico
    await db.insert(manusaAcoes).values({
      tipo: "A2",
      descricao: `Recalibração de parâmetros para ICP ${icp}${observacao ? ": " + observacao : ""}`,
      campanha: icp,
      status: "executada",
      metadados: updates,
    });

    return res.json({ ok: true, message: `Parâmetros do ICP '${icp}' atualizados` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/themis/briefing-criativo ─────────────────────────────────────
// Themis solicita geração de criativo para uma pauta

themisRouter.post("/briefing-criativo", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { pautaId, formato, hook, cta, observacoes } = req.body;

    if (!pautaId || !formato) {
      return res
        .status(400)
        .json({ error: "Campos 'pautaId' e 'formato' são obrigatórios", code: "MISSING_FIELDS" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    // Registra a solicitação como ação A3 pendente de aprovação
    const [result] = await db.insert(manusaAcoes).values({
      tipo: "A3",
      descricao: `Briefing de criativo solicitado pelo Themis — Formato: ${formato}`,
      campanha: `pauta_${pautaId}`,
      status: "pendente_aprovacao",
      metadados: { pautaId, formato, hook, cta, observacoes },
    });

    return res.status(201).json({
      ok: true,
      message: "Briefing registrado. Aguardando aprovação de Maycon para geração.",
      acaoId: (result as any).insertId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/themis/acao ───────────────────────────────────────────────────
// Registra uma ação A1/A2/A3 no histórico (ex: Themis pausou algo, ARES gerou algo)

themisRouter.post("/acao", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { tipo, descricao, campanha, status, metadados } = req.body;

    if (!tipo || !descricao) {
      return res
        .status(400)
        .json({ error: "Campos 'tipo' e 'descricao' são obrigatórios", code: "MISSING_FIELDS" });
    }

    if (!["A1", "A2", "A3"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo deve ser A1, A2 ou A3", code: "INVALID_TIPO" });
    }

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    const [result] = await db.insert(manusaAcoes).values({
      tipo,
      descricao,
      campanha: campanha ?? null,
      status: status ?? "executada",
      metadados: metadados ?? null,
    });

    return res.status(201).json({
      ok: true,
      message: "Ação registrada",
      id: (result as any).insertId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/themis/feedback ────────────────────────────────────────────────
// Retorna o último feedback semanal (últimas ações + performance resumida)

themisRouter.get("/feedback", requireApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    const [acoes, pautas, params] = await Promise.all([
      db.select().from(manusaAcoes).orderBy(desc(manusaAcoes.criadoEm)).limit(50),
      db.select().from(themisPautas).orderBy(desc(themisPautas.criadoEm)).limit(20),
      db.select().from(manusaParams).orderBy(manusaParams.icp),
    ]);

    // Agrupa ações por tipo
    const porTipo = { A1: 0, A2: 0, A3: 0 };
    for (const a of acoes) {
      porTipo[a.tipo]++;
    }

    return res.json({
      ok: true,
      geradoEm: new Date().toISOString(),
      resumo: {
        totalAcoes: acoes.length,
        porTipo,
        totalPautas: pautas.length,
        pautasPorStatus: pautas.reduce(
          (acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      parametrosAtuais: params,
      ultimasAcoes: acoes.slice(0, 20).map((a) => ({
        tipo: a.tipo,
        descricao: a.descricao,
        campanha: a.campanha,
        status: a.status,
        criadoEm: a.criadoEm,
      })),
      ultimasPautas: pautas.slice(0, 10).map((p) => ({
        titulo: p.titulo,
        pilar: p.pilar,
        icp: p.icp,
        faseTeia: p.faseTeia,
        status: p.status,
        criadoEm: p.criadoEm,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/themis/pautas ──────────────────────────────────────────────────
// Lista pautas registradas com filtros opcionais

themisRouter.get("/pautas", requireApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "DB indisponível" });

    const pautas = await db
      .select()
      .from(themisPautas)
      .orderBy(desc(themisPautas.criadoEm))
      .limit(50);

    return res.json({ ok: true, total: pautas.length, pautas });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
