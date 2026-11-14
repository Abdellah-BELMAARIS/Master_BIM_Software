import * as functions from "firebase-functions/v2/https";
import type { Response as ExpressResponse } from "express";

const CYPE_API_BASE = "https://apis.bimserver.center/v1/BIMSERVER";

const DEFAULT_SCOPES = [
  "DATA_USER_READ",
  "PROJECTS_USER_READ",
  "PROJECTS_USER_WRITE",
  "CONTRIBUTIONS_USER_READ",
  "CONTRIBUTIONS_USER_WRITE",
  "OFFLINE_ACCESS",
];

function isTrustedCypeHost(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return host === "bimserver.center" || host.endsWith(".bimserver.center");
  } catch {
    return false;
  }
}

async function forwardJsonResponse(
  apiRes: globalThis.Response,
  res: ExpressResponse,
  fallbackRaw = false
): Promise<void> {
  const rawText = await apiRes.text();
  try {
    res.status(apiRes.status).json(rawText ? JSON.parse(rawText) : {});
  } catch {
    if (fallbackRaw) {
      res.status(apiRes.status).json({ status: apiRes.status, raw: rawText });
    } else {
      res.status(apiRes.status).json({ error: rawText || `HTTP ${apiRes.status}` });
    }
  }
}

export const cypeLogin = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      const { clientId: bodyClientId, clientSecret: bodySecret, redirectUri, scope } = req.body || {};
      const client_id = String(bodyClientId || process.env.CYPE_CLIENT_ID || "").trim();
      const client_secret = String(bodySecret || process.env.CYPE_CLIENT_SECRET || "").trim();

      if (!client_id || !client_secret) {
        res.status(400).json({
          error: "CYPE Client ID and Client Secret are required (set in UI or functions/.env CYPE_CLIENT_ID / CYPE_CLIENT_SECRET).",
        });
        return;
      }

      const scopes = Array.isArray(scope) && scope.length > 0 ? scope : DEFAULT_SCOPES;

      const apiRes = await fetch(`${CYPE_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id,
          client_secret,
          redirect_uri: redirectUri || "https://master-bim-software.web.app/",
          scope: scopes,
        }),
      });

      await forwardJsonResponse(apiRes, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "BIMserver.center login initialization failed";
      console.error("[cypeLogin] Error:", error);
      res.status(500).json({ error: message });
    }
  }
);

export const cypeExchangeSession = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      const { sessionTemp, securityId, refreshToken, clientId, clientSecret } = req.body || {};
      let apiRes: globalThis.Response;

      if (refreshToken) {
        const client_id = String(clientId || process.env.CYPE_CLIENT_ID || "").trim();
        const client_secret = String(clientSecret || process.env.CYPE_CLIENT_SECRET || "").trim();
        apiRes = await fetch(`${CYPE_API_BASE}/login/refresh_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ client_id, client_secret, refresh_token: refreshToken }),
        });
      } else if (sessionTemp && securityId) {
        const qs = new URLSearchParams({ security_id: String(securityId) });
        apiRes = await fetch(
          `${CYPE_API_BASE}/login/${encodeURIComponent(String(sessionTemp))}?${qs.toString()}`,
          { method: "GET", headers: { Accept: "application/json" } }
        );
      } else {
        res.status(400).json({ error: "Provide sessionTemp + securityId or refreshToken." });
        return;
      }

      await forwardJsonResponse(apiRes, res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed exchanging BIMserver.center session";
      console.error("[cypeExchangeSession] Error:", error);
      res.status(500).json({ error: message });
    }
  }
);

export const cypeProxy = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      const { endpoint, sessionId, method = "GET", body } = req.body || {};
      if (!endpoint || !sessionId || !String(endpoint).startsWith("/")) {
        res.status(400).json({ error: "Valid BIMserver.center relative endpoint and sessionId are required." });
        return;
      }

      const apiRes = await fetch(`${CYPE_API_BASE}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: method !== "GET" && body ? JSON.stringify(body) : undefined,
      });

      await forwardJsonResponse(apiRes, res, true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "BIMserver.center API request failed";
      console.error("[cypeProxy] Error:", error);
      res.status(500).json({ error: message });
    }
  }
);

export const cypeDownloadFile = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      const { fileUrl, sessionId } = req.body || {};
      const targetUrl = String(fileUrl || "");
      if (!targetUrl || !isTrustedCypeHost(targetUrl)) {
        res.status(400).json({ error: "Valid bimserver.center fileUrl is required." });
        return;
      }

      const headers: Record<string, string> = {};
      if (sessionId) {
        headers.Authorization = `Bearer ${sessionId}`;
      }

      const fileRes = await fetch(targetUrl, { headers });
      if (!fileRes.ok) {
        res.status(fileRes.status).json({ error: `Failed downloading CYPE IFC file (HTTP ${fileRes.status})` });
        return;
      }

      const arrayBuffer = await fileRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      res.status(200).json({
        status: "success",
        base64,
        contentType: fileRes.headers.get("content-type") || "application/octet-stream",
        size: arrayBuffer.byteLength,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed streaming BIMserver.center file";
      console.error("[cypeDownloadFile] Error:", error);
      res.status(500).json({ error: message });
    }
  }
);
