import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB helpers
vi.mock("./db", () => ({
  getManusaParams: vi.fn().mockResolvedValue([
    { id: 1, icp: "saude", cplMeta: "15.00", cplTeto: "30.00", ctrMinimo: "0.50", orcamentoMaxDia: "100.00", updatedAt: new Date() },
  ]),
  upsertManusaParam: vi.fn().mockResolvedValue(undefined),
  getManusaRotinas: vi.fn().mockResolvedValue([
    { id: 1, slug: "daily-brief", nome: "Daily Brief", descricao: "Desc", taskId: "task123", ativa: true, frequencia: "Seg–Sex 21h", proximaExecucao: null, ultimaExecucao: null, updatedAt: new Date() },
  ]),
  toggleManusaRotina: vi.fn().mockResolvedValue(undefined),
  updateRotinaUltimaExecucao: vi.fn().mockResolvedValue(undefined),
  getManusaAcoes: vi.fn().mockResolvedValue([
    { id: 1, tipo: "A1", descricao: "Pausou criativo", campanha: "Campanha X", status: "executada", metadados: null, criadoEm: new Date() },
  ]),
  insertManusaAcao: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

function createCtx(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("params router", () => {
  it("lista parâmetros por ICP", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.params.list();
    expect(result).toHaveLength(1);
    expect(result[0].icp).toBe("saude");
  });

  it("atualiza parâmetros de um ICP", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.params.update({
      icp: "saude",
      cplMeta: "18.00",
      cplTeto: "35.00",
      ctrMinimo: "0.60",
      orcamentoMaxDia: "120.00",
    });
    expect(result.success).toBe(true);
  });
});

describe("rotinas router", () => {
  it("lista rotinas", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.rotinas.list();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("daily-brief");
  });

  it("alterna estado de uma rotina", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.rotinas.toggle({ slug: "daily-brief", ativa: false });
    expect(result.success).toBe(true);
  });
});

describe("acoes router", () => {
  it("lista ações sem filtro", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.acoes.list({});
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe("A1");
  });

  it("insere nova ação", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.acoes.insert({
      tipo: "A2",
      descricao: "Propôs aumento de orçamento",
      campanha: "Campanha Y",
      status: "aguardando_ok",
    });
    expect(result.success).toBe(true);
  });
});

describe("manusa status router", () => {
  it("retorna status online quando há rotinas ativas", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.manusa.status();
    expect(result.online).toBe(true);
    expect(result.rotinasAtivas).toBe(1);
    expect(result.totalRotinas).toBe(1);
  });
});
