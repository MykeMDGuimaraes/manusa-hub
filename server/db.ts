import { eq, desc, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  manusaParams,
  manusaRotinas,
  manusaAcoes,
  InsertManusaParams,
  InsertManusaRotina,
  InsertManusaAcao,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Manusa Params ────────────────────────────────────────────────────────────

export async function getManusaParams() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(manusaParams).orderBy(manusaParams.icp);
}

export async function upsertManusaParam(data: InsertManusaParams) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .insert(manusaParams)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        cplMeta: data.cplMeta,
        cplTeto: data.cplTeto,
        ctrMinimo: data.ctrMinimo,
        orcamentoMaxDia: data.orcamentoMaxDia,
      },
    });
}

// ─── Manusa Rotinas ───────────────────────────────────────────────────────────

export async function getManusaRotinas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(manusaRotinas).orderBy(manusaRotinas.id);
}

export async function toggleManusaRotina(slug: string, ativa: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(manusaRotinas).set({ ativa }).where(eq(manusaRotinas.slug, slug));
}

export async function updateRotinaUltimaExecucao(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(manusaRotinas)
    .set({ ultimaExecucao: new Date() })
    .where(eq(manusaRotinas.slug, slug));
}

// ─── Manusa Ações ─────────────────────────────────────────────────────────────

export async function getManusaAcoes(filters?: {
  tipo?: "A1" | "A2" | "A3";
  campanha?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.tipo) conditions.push(eq(manusaAcoes.tipo, filters.tipo));
  if (filters?.campanha) conditions.push(eq(manusaAcoes.campanha, filters.campanha));
  if (filters?.dataInicio) conditions.push(gte(manusaAcoes.criadoEm, filters.dataInicio));
  if (filters?.dataFim) conditions.push(lte(manusaAcoes.criadoEm, filters.dataFim));

  const query = db
    .select()
    .from(manusaAcoes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(manusaAcoes.criadoEm))
    .limit(filters?.limit ?? 100);

  return query;
}

export async function insertManusaAcao(data: InsertManusaAcao) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(manusaAcoes).values(data);
}
