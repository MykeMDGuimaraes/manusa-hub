import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getManusaParams,
  upsertManusaParam,
  getManusaRotinas,
  toggleManusaRotina,
  updateRotinaUltimaExecucao,
  getManusaAcoes,
  insertManusaAcao,
  getOlimpoWorkflows,
  getOlimpoOperadores,
  updateWorkflowStatus,
} from "./db";

const MANUS_API_BASE = "https://api.manus.ai/v2";
const MANUS_API_KEY = process.env.MANUS_API_KEY ?? "";

async function manusApiPost(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${MANUS_API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MANUS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Manus API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  params: router({
    list: protectedProcedure.query(async () => getManusaParams()),
    update: protectedProcedure
      .input(z.object({
        icp: z.enum(["saude", "mentor", "b2b"]),
        cplMeta: z.string(),
        cplTeto: z.string(),
        ctrMinimo: z.string(),
        orcamentoMaxDia: z.string(),
      }))
      .mutation(async ({ input }) => {
        await upsertManusaParam(input);
        return { success: true };
      }),
  }),

  rotinas: router({
    list: protectedProcedure.query(async () => getManusaRotinas()),
    toggle: protectedProcedure
      .input(z.object({ slug: z.string(), ativa: z.boolean() }))
      .mutation(async ({ input }) => {
        // Atualiza no banco primeiro
        await toggleManusaRotina(input.slug, input.ativa);
        // Registra a ação no histórico
        await insertManusaAcao({
          tipo: "A1",
          descricao: `Rotina "${input.slug}" ${input.ativa ? "ativada" : "pausada"} via Portal Hub`,
          campanha: null,
          status: "executada",
        });
        return { success: true };
      }),
    executarAgora: protectedProcedure
      .input(z.object({ slug: z.string(), taskId: z.string().nullable() }))
      .mutation(async ({ input }) => {
        if (!input.taskId) throw new Error("Task ID não configurado para esta rotina");
        const rotinas = await getManusaRotinas();
        const rotina = rotinas.find((r) => r.slug === input.slug);
        if (!rotina) throw new Error("Rotina não encontrada");
        await manusApiPost("task.create", {
          project_id: "AkbrJ2RNFieatEdyvMH6YF",
          message: {
            role: "user",
            content: `[EXECUÇÃO MANUAL] Executar rotina: ${rotina.nome}\n\nExecute agora a rotina "${rotina.nome}" conforme seu playbook. Esta é uma execução manual solicitada pelo operador via Portal Manusa Hub.`,
          },
        });
        await updateRotinaUltimaExecucao(input.slug);
        await insertManusaAcao({
          tipo: "A1",
          descricao: `Execução manual da rotina "${rotina.nome}" via Portal Hub`,
          campanha: null,
          status: "executada",
        });
        return { success: true };
      }),
  }),

  acoes: router({
    list: protectedProcedure
      .input(z.object({
        tipo: z.enum(["A1", "A2", "A3"]).optional(),
        campanha: z.string().optional(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        limit: z.number().min(1).max(500).optional(),
      }).optional())
      .query(async ({ input }) => getManusaAcoes(input ?? {})),
    insert: protectedProcedure
      .input(z.object({
        tipo: z.enum(["A1", "A2", "A3"]),
        descricao: z.string(),
        campanha: z.string().optional(),
        status: z.enum(["executada", "aguardando_ok", "pendente_aprovacao", "rejeitada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await insertManusaAcao({
          tipo: input.tipo,
          descricao: input.descricao,
          campanha: input.campanha ?? null,
          status: input.status ?? "executada",
        });
        return { success: true };
      }),
  }),

  manusa: router({
    status: protectedProcedure.query(async () => {
      try {
        const rotinas = await getManusaRotinas();
        const ativas = rotinas.filter((r) => r.ativa).length;
        return { online: ativas > 0, rotinasAtivas: ativas, totalRotinas: rotinas.length };
      } catch {
        return { online: false, rotinasAtivas: 0, totalRotinas: 0 };
      }
    }),
  }),

  olimpo: router({
    workflows: protectedProcedure.query(async () => getOlimpoWorkflows()),
    operadores: protectedProcedure.query(async () => getOlimpoOperadores()),
    updateWorkflow: protectedProcedure
      .input(z.object({
        workflowId: z.string(),
        ultimoStatus: z.enum(["ok", "erro", "pendente", "desconhecido"]),
      }))
      .mutation(async ({ input }) => {
        await updateWorkflowStatus(input.workflowId, input.ultimoStatus);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
