import type { Express, NextFunction, Request, Response } from "express";
import { Readable } from "node:stream";

/**
 * Gateway/reverse proxy — transição de domínio (2026-07-23).
 *
 * O domínio meta.mdiasolutions.tech está registrado NESTE projeto (hub), mas o
 * produto principal é o Manusa Dash. Em vez de mover o registro de domínio na
 * plataforma (exige acesso ao painel), este middleware encaminha
 * TRANSPARENTEMENTE todo o tráfego que chega com Host = meta.mdiasolutions.tech
 * para o Dash. O hub continua respondendo normalmente na URL
 * diasolutions-lgfnqque.manus.space.
 *
 * Sem dependências novas: streaming puro (fetch + Readable), bodies não são
 * buffered. Para desligar: GATEWAY_DASH=off. Para trocar o alvo:
 * GATEWAY_DASH_TARGET=https://outro-app.manus.space
 */

const DASH_HOST = "diadash-niv2azh7.manus.space";
const PUBLIC_DOMAIN = "meta.mdiasolutions.tech";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding",
  "host",
]);

function isGatewayEnabled(): boolean {
  return (process.env.GATEWAY_DASH ?? "on").toLowerCase() !== "off";
}

function targetBase(): string {
  return process.env.GATEWAY_DASH_TARGET ?? `https://${DASH_HOST}`;
}

async function proxyToDash(req: Request, res: Response): Promise<void> {
  const url = `${targetBase()}${req.originalUrl}`;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  // O gateway da Manus roteia por Host — precisa ser o do app de destino
  headers.host = DASH_HOST;
  // Resposta sem compressão simplifica o streaming 1:1
  headers["accept-encoding"] = "identity";
  headers["x-forwarded-host"] = PUBLIC_DOMAIN;
  headers["x-forwarded-proto"] = "https";

  const hasBody = !["GET", "HEAD"].includes(req.method);

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    // @ts-expect-error — duplex é obrigatório para request body em stream
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
  });

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
}

/** Registra o gateway ANTES de qualquer body parser ou rota. */
export function registerDashGateway(app: Express): void {
  if (!isGatewayEnabled()) {
    console.log("[gateway] desligado (GATEWAY_DASH=off)");
    return;
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    // O edge da Manus reescreve Host para o hostname interno — o domínio
    // público original chega em X-Forwarded-Host (prioridade), com Host
    // como fallback (acesso direto, dev local).
    const forwarded = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
    const host = (forwarded || String(req.headers.host ?? "")).split(":")[0].toLowerCase();
    if (host !== PUBLIC_DOMAIN) return next();

    proxyToDash(req, res).catch((error) => {
      console.error("[gateway] falha ao proxyar para o Dash:", error);
      if (!res.headersSent) {
        res.status(502).send("Bad gateway — Dash indisponível");
      } else {
        res.end();
      }
    });
  });
  console.log(`[gateway] ${PUBLIC_DOMAIN} → ${targetBase()} (host-conditional, x-forwarded-host aware)`);
}
