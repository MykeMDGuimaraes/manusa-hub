/**
 * Testes de integração para a API Themis (endpoints REST autenticados por API key)
 * Usa supertest para exercitar o router Express real com banco mockado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import crypto from "crypto";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

// Gera uma key de teste válida
const VALID_KEY_RAW = "mhk_test_valid_key_abc123def456789";
const VALID_KEY_HASH = crypto.createHash("sha256").update(VALID_KEY_RAW).digest("hex");

const MOCK_API_KEY = {
  id: 1,
  name: "Themis Bridge v1",
  keyHash: VALID_KEY_HASH,
  keyPrefix: "mhk_test_val",
  owner: "themis",
  ativa: true,
  lastUsedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cria um mock de DB que retorna a API key válida na busca */
function makeMockDbWithKey() {
  const updateWhere = vi.fn().mockResolvedValue([]);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: updateSet });

  const selectLimit = vi.fn().mockResolvedValue([MOCK_API_KEY]);
  const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere, orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) });
  const mockSelect = vi.fn().mockReturnValue({ from: selectFrom });

  const insertValues = vi.fn().mockResolvedValue([{ insertId: 42 }]);
  const mockInsert = vi.fn().mockReturnValue({ values: insertValues });

  return { select: mockSelect, update: mockUpdate, insert: mockInsert };
}

/** Cria um mock de DB que não encontra nenhuma API key (key inválida) */
function makeMockDbNoKey() {
  const selectLimit = vi.fn().mockResolvedValue([]); // nenhuma key encontrada
  const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: selectFrom });
  const updateWhere = vi.fn().mockResolvedValue([]);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: updateSet });
  const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
  const mockInsert = vi.fn().mockReturnValue({ values: insertValues });
  return { select: mockSelect, update: mockUpdate, insert: mockInsert };
}

/** Cria app Express com o themisRouter montado */
async function makeApp(dbMock: ReturnType<typeof makeMockDbWithKey> | null = null) {
  vi.mocked(getDb).mockResolvedValue(dbMock as any);
  const { themisRouter } = await import("./themis.api");
  const app = express();
  app.use(express.json());
  app.use("/api/themis", themisRouter);
  return app;
}

// ─── Testes de autenticação ───────────────────────────────────────────────────

describe("GET /api/themis/status — autenticação", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deve retornar 401 sem API key", async () => {
    const app = await makeApp(makeMockDbWithKey());
    const res = await request(app).get("/api/themis/status");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_KEY");
  });

  it("deve retornar 401 com API key inválida", async () => {
    vi.mocked(getDb).mockResolvedValue(makeMockDbNoKey() as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);
    const res = await request(app)
      .get("/api/themis/status")
      .set("X-API-Key", "mhk_invalid_key_xyz");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_KEY");
  });

  it("deve retornar 503 quando DB está indisponível", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);
    const res = await request(app)
      .get("/api/themis/status")
      .set("X-API-Key", VALID_KEY_RAW);
    expect(res.status).toBe(503);
  });
});

// ─── Testes de endpoint POST /pauta ──────────────────────────────────────────

describe("POST /api/themis/pauta", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deve retornar 400 quando 'titulo' está ausente", async () => {
    // Monta DB que passa na autenticação
    const db = makeMockDbWithKey();
    // Mas o select de pautas também precisa ser mockado para o insert
    vi.mocked(getDb).mockResolvedValue(db as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);

    const res = await request(app)
      .post("/api/themis/pauta")
      .set("X-API-Key", VALID_KEY_RAW)
      .send({ pilar: "educacao", icp: "saude" }); // sem titulo
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("MISSING_TITULO");
  });

  it("deve aceitar pauta válida com titulo e retornar 201", async () => {
    const db = makeMockDbWithKey();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);

    const res = await request(app)
      .post("/api/themis/pauta")
      .set("X-API-Key", VALID_KEY_RAW)
      .send({
        titulo: "Como a IA está transformando a saúde",
        pilar: "educacao",
        icp: "saude",
        faseTeia: "consciencia",
        ancora: "hook_direto",
        modoPublicacao: "hibrido",
      });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Testes de endpoint POST /acao ────────────────────────────────────────────

describe("POST /api/themis/acao", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("deve retornar 400 quando 'tipo' está ausente", async () => {
    const db = makeMockDbWithKey();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);

    const res = await request(app)
      .post("/api/themis/acao")
      .set("X-API-Key", VALID_KEY_RAW)
      .send({ descricao: "Ação sem tipo" });
    expect(res.status).toBe(400);
  });

  it("deve retornar 400 para tipo inválido (A4)", async () => {
    const db = makeMockDbWithKey();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);

    const res = await request(app)
      .post("/api/themis/acao")
      .set("X-API-Key", VALID_KEY_RAW)
      .send({ tipo: "A4", descricao: "Tipo inválido" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TIPO");
  });

  it("deve aceitar ação A1 válida e retornar 201", async () => {
    const db = makeMockDbWithKey();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const { themisRouter } = await import("./themis.api");
    const app = express();
    app.use(express.json());
    app.use("/api/themis", themisRouter);

    const res = await request(app)
      .post("/api/themis/acao")
      .set("X-API-Key", VALID_KEY_RAW)
      .send({ tipo: "A1", descricao: "Criativo pausado por CPL > teto", campanha: "camp_saude_01" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Testes de hash de API key (unitários) ────────────────────────────────────

describe("Hash de API key", () => {
  it("mesma key deve gerar mesmo hash (determinístico)", () => {
    const key = "mhk_test_deterministic_key";
    const hash1 = crypto.createHash("sha256").update(key).digest("hex");
    const hash2 = crypto.createHash("sha256").update(key).digest("hex");
    expect(hash1).toBe(hash2);
  });

  it("keys diferentes devem gerar hashes diferentes", () => {
    const hash1 = crypto.createHash("sha256").update("mhk_key_a").digest("hex");
    const hash2 = crypto.createHash("sha256").update("mhk_key_b").digest("hex");
    expect(hash1).not.toBe(hash2);
  });

  it("key gerada deve ter formato mhk_<48 hex chars>", () => {
    const rawKey = `mhk_${crypto.randomBytes(24).toString("hex")}`;
    expect(rawKey).toMatch(/^mhk_[0-9a-f]{48}$/);
  });
});
