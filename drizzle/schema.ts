import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Parâmetros da Manusa por ICP
export const manusaParams = mysqlTable("manusa_params", {
  id: int("id").autoincrement().primaryKey(),
  icp: mysqlEnum("icp", ["saude", "mentor", "b2b"]).notNull().unique(),
  cplMeta: decimal("cplMeta", { precision: 10, scale: 2 }).notNull().default("15.00"),
  cplTeto: decimal("cplTeto", { precision: 10, scale: 2 }).notNull().default("30.00"),
  ctrMinimo: decimal("ctrMinimo", { precision: 5, scale: 2 }).notNull().default("0.50"),
  orcamentoMaxDia: decimal("orcamentoMaxDia", { precision: 10, scale: 2 }).notNull().default("100.00"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManusaParams = typeof manusaParams.$inferSelect;
export type InsertManusaParams = typeof manusaParams.$inferInsert;

// Rotinas da Manusa
export const manusaRotinas = mysqlTable("manusa_rotinas", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  descricao: text("descricao"),
  taskId: varchar("taskId", { length: 128 }),
  ativa: boolean("ativa").notNull().default(true),
  frequencia: varchar("frequencia", { length: 128 }),
  proximaExecucao: timestamp("proximaExecucao"),
  ultimaExecucao: timestamp("ultimaExecucao"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManusaRotina = typeof manusaRotinas.$inferSelect;
export type InsertManusaRotina = typeof manusaRotinas.$inferInsert;

// Histórico de ações da Manusa
export const manusaAcoes = mysqlTable("manusa_acoes", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["A1", "A2", "A3"]).notNull(),
  descricao: text("descricao").notNull(),
  campanha: varchar("campanha", { length: 256 }),
  status: mysqlEnum("status", ["executada", "aguardando_ok", "pendente_aprovacao", "rejeitada"]).notNull().default("executada"),
  metadados: json("metadados"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
});

export type ManusaAcao = typeof manusaAcoes.$inferSelect;
export type InsertManusaAcao = typeof manusaAcoes.$inferInsert;

// Workflows do Olimpo (n8n)
export const olimpoWorkflows = mysqlTable("olimpo_workflows", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: varchar("workflowId", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  descricao: text("descricao"),
  cadencia: varchar("cadencia", { length: 128 }),
  operador: mysqlEnum("operador", ["themis", "ares", "manusa", "jhon", "sistema"]).notNull().default("sistema"),
  ativo: boolean("ativo").notNull().default(true),
  ultimaExecucao: timestamp("ultimaExecucao"),
  ultimoStatus: mysqlEnum("ultimoStatus", ["ok", "erro", "pendente", "desconhecido"]).notNull().default("desconhecido"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OlimpoWorkflow = typeof olimpoWorkflows.$inferSelect;
export type InsertOlimpoWorkflow = typeof olimpoWorkflows.$inferInsert;

// Operadores do Olimpo
export const olimpoOperadores = mysqlTable("olimpo_operadores", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  nome: varchar("nome", { length: 64 }).notNull(),
  papel: varchar("papel", { length: 128 }).notNull(),
  cerebro: varchar("cerebro", { length: 128 }),
  camada: varchar("camada", { length: 64 }),
  status: mysqlEnum("status", ["online", "offline", "degradado", "desconhecido"]).notNull().default("desconhecido"),
  ultimaAtividade: timestamp("ultimaAtividade"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OlimpoOperador = typeof olimpoOperadores.$inferSelect;
export type InsertOlimpoOperador = typeof olimpoOperadores.$inferInsert;

// API Keys para integração Themis sem OAuth
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  keyHash: varchar("keyHash", { length: 256 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
  owner: varchar("owner", { length: 64 }).notNull().default("themis"),
  ativa: boolean("ativa").notNull().default(true),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Pautas recebidas do Themis
export const themisPautas = mysqlTable("themis_pautas", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }).unique(),
  titulo: varchar("titulo", { length: 256 }).notNull(),
  pilar: varchar("pilar", { length: 64 }),
  icp: varchar("icp", { length: 64 }),
  faseTeia: varchar("faseTeia", { length: 32 }),
  ancora: varchar("ancora", { length: 64 }),
  textoAres: text("textoAres"),
  modoPublicacao: mysqlEnum("modoPublicacao", ["organico", "pago", "hibrido"]).default("hibrido"),
  status: mysqlEnum("status", ["recebida", "em_campanha", "publicada", "pausada", "rejeitada"]).notNull().default("recebida"),
  metadados: json("metadados"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ThemisPauta = typeof themisPautas.$inferSelect;
export type InsertThemisPauta = typeof themisPautas.$inferInsert;
