import * as functions from "firebase-functions/v2/https";
import type { Response } from "express";

const CYPE_API = new URL("https://apis.bimserver.center/v1/BIMSERVER");
const CYPE_SCOPES = [
  "DATA_USER_READ",
  "PROJECTS_USER_READ",
  "PROJECTS_USER_WRITE",
  "CONTRIBUTIONS_USER_READ",
  "CONTRIBUTIONS_USER_WRITE",
  "OFFLINE_ACCESS",
];
const MAX_PROXY_BODY_LENGTH = 128_000;
const MAX_DOWNLOAD_LENGTH = 256 * 1024 * 1024;
const LOCAL_VIEWER_ORIGINS = ["http://127.0.0.1:5174", "http://localhost:5174"];

function getAllowedOrigins(): string[] {
  const origins = (process.env.CYPE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.FUNCTIONS_EMULATOR === "true") {
    origins.push(...LOCAL_VIEWER_ORIGINS);
  }

  return [...new Set(origins)];
}

const configuredCorsOrigins = getAllowedOrigins();
const CORS_ORIGINS: string[] | false = configuredCorsOrigins.length
  ? configuredCorsOrigins
  : false;

function getRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getString(value: unknown, maxLength: number): string {
  return typeof value === "string" && value.length <= maxLength
    ? value.trim()
    : "";
}

function requirePost(req: functions.Request, res: Response): boolean {
  if (req.method === "POST") return true;
  res.set("Allow", "POST").status(405).json({ error: "Method Not Allowed. Use POST." });
  return false;
}

function getRedirectUri(value: unknown): string {
  const redirectUri = getString(value, 2048);
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error("Provide a valid registered CYPE callback URI.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const validProtocol = url.protocol === "https:" || (isLoopback && url.protocol === "http:");
  const isLocalEmulatorOrigin = isLoopback && process.env.FUNCTIONS_EMULATOR === "true";
  if (
    !validProtocol ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (!configuredCorsOrigins.includes(url.origin) && !isLocalEmulatorOrigin)
  ) {
    throw new Error("The callback URI must be a registered trusted app origin.");
  }

  return url.toString();
}

async function sendJsonResponse(
  upstream: globalThis.Response,
  res: Response
): Promise<void> {
  const rawText = await upstream.text();
  if (!rawText) {
    res.status(upstream.status).json({});
    return;
  }

  try {
    res.status(upstream.status).json(JSON.parse(rawText));
  } catch {
    res.status(upstream.status).json({
      error: "BIMserver.center returned an invalid response.",
    });
  }
}

function getApiUrl(endpoint: string, method: string): URL | null {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(`${CYPE_API.origin}${CYPE_API.pathname}${endpoint}`);
  } catch {
    return null;
  }
  if (url.origin !== CYPE_API.origin) return null;

  const route = url.pathname.slice(CYPE_API.pathname.length);
  const segments = route.split("/").filter(Boolean);
  const projectId = segments.length === 3 && segments[0] === "projects"
    ? decodeURIComponentSafely(segments[1])
    : "";
  const validProjectId = /^[A-Za-z0-9_-]{1,128}$/.test(projectId);

  let allowed = false;
  if (route === "/projects" && method === "GET") allowed = true;
  if (route === "/contributions" && method === "POST") allowed = true;
  if (
    validProjectId &&
    segments[0] === "projects" &&
    segments[2] === "contributions" &&
    segments.length === 3 &&
    method === "GET"
  ) {
    allowed = true;
  }
  if (
    validProjectId &&
    segments[0] === "projects" &&
    segments[2] === "issues" &&
    segments.length === 3 &&
    (method === "GET" || method === "POST")
  ) {
    allowed = true;
  }
  if (!allowed) return null;

  for (const key of url.searchParams.keys()) {
    const allowedKeys = route === "/projects"
      ? ["limit"]
      : route.endsWith("/contributions")
      ? ["expand", "limit"]
      : ["limit"];
    if (!allowedKeys.includes(key)) return null;
    const values = url.searchParams.getAll(key);
    if (values.length !== 1) return null;
    if (key === "limit" && !/^(?:[1-9]\d?|100)$/.test(values[0])) return null;
    if (key === "expand" && values[0] !== "documents") return null;
  }

  return url;
}

function decodeURIComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function isAllowedDownloadUrl(value: unknown): URL | null {
  const rawUrl = getString(value, 4096);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    return null;
  }

  const configuredHosts = (process.env.CYPE_DOWNLOAD_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const trustedHosts = [...new Set(["bimserver.center", "apis.bimserver.center", ...configuredHosts])];
  const hostname = url.hostname.toLowerCase();
  return trustedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    ? url
    : null;
}

async function fetchTrustedDownload(
  initialUrl: URL,
  sessionId: string
): Promise<globalThis.Response> {
  let url = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const headers: Record<string, string> = {};
    const hostname = url.hostname.toLowerCase();
    const isBimserverCenter = hostname === "bimserver.center" || hostname.endsWith(".bimserver.center");
    if (sessionId && isBimserverCenter) headers.Authorization = `Bearer ${sessionId}`;

    const response = await fetch(url, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get("location");
    const nextUrl = location ? isAllowedDownloadUrl(new URL(location, url).toString()) : null;
    if (!nextUrl) throw new Error("BIMserver.center returned an untrusted file redirect.");
    url = nextUrl;
  }
  throw new Error("Too many redirects while downloading the CYPE file.");
}

export const cypeLogin = functions.onRequest(
  { cors: CORS_ORIGINS },
  async (req, res) => {
    if (!requirePost(req, res)) return;

    const body = getRecord(req.body) || {};
    const clientId = getString(body.clientId, 512) || getString(process.env.CYPE_CLIENT_ID, 512);
    const clientSecret = getString(body.clientSecret, 4096) || getString(process.env.CYPE_CLIENT_SECRET, 4096);
    if (!clientId || !clientSecret) {
      res.status(400).json({ error: "CYPE Client ID and Client Secret are required." });
      return;
    }

    let redirectUri: string;
    try {
      redirectUri = getRedirectUri(body.redirectUri);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid callback URI." });
      return;
    }

    try {
      const upstream = await fetch(`${CYPE_API.toString()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          scope: CYPE_SCOPES,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      await sendJsonResponse(upstream, res);
    } catch (error) {
      console.error("[cypeLogin] Upstream request failed:", error instanceof Error ? error.name : "Unknown error");
      res.status(502).json({ error: "Could not reach BIMserver.center to start login." });
    }
  }
);

export const cypeExchangeSession = functions.onRequest(
  { cors: CORS_ORIGINS },
  async (req, res) => {
    if (!requirePost(req, res)) return;

    const body = getRecord(req.body) || {};
    const refreshToken = getString(body.refreshToken, 8192);
    const sessionTemp = getString(body.sessionTemp, 2048);
    const securityId = getString(body.securityId, 2048);
    let url: URL;
    let init: RequestInit;

    if (refreshToken) {
      const clientId = getString(body.clientId, 512) || getString(process.env.CYPE_CLIENT_ID, 512);
      const clientSecret = getString(body.clientSecret, 4096) || getString(process.env.CYPE_CLIENT_SECRET, 4096);
      if (!clientId || !clientSecret) {
        res.status(400).json({ error: "CYPE Client ID and Client Secret are required to refresh the session." });
        return;
      }
      url = new URL(`${CYPE_API.toString()}/login/refresh_token`);
      init = {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      };
    } else if (sessionTemp && securityId) {
      url = new URL(`${CYPE_API.toString()}/login/${encodeURIComponent(sessionTemp)}`);
      url.searchParams.set("security_id", securityId);
      init = { method: "GET", headers: { Accept: "application/json" } };
    } else {
      res.status(400).json({ error: "Provide a pending CYPE login or a refresh token." });
      return;
    }

    try {
      const upstream = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
      await sendJsonResponse(upstream, res);
    } catch (error) {
      console.error(
        "[cypeExchangeSession] Upstream request failed:",
        error instanceof Error ? error.name : "Unknown error"
      );
      res.status(502).json({ error: "Could not exchange the BIMserver.center session." });
    }
  }
);

export const cypeProxy = functions.onRequest(
  { cors: CORS_ORIGINS },
  async (req, res) => {
    if (!requirePost(req, res)) return;

    const body = getRecord(req.body) || {};
    const endpoint = getString(body.endpoint, 2048);
    const sessionId = getString(body.sessionId, 8192);
    const method = getString(body.method, 8).toUpperCase() || "GET";
    const apiUrl = getApiUrl(endpoint, method);
    if (!apiUrl || !sessionId) {
      res.status(400).json({ error: "A valid BIMserver.center session and supported API route are required." });
      return;
    }

    let requestBody: string | undefined;
    if (method === "POST") {
      const apiBody = getRecord(body.body);
      if (!apiBody) {
        res.status(400).json({ error: "A JSON object is required for this BIMserver.center request." });
        return;
      }
      requestBody = JSON.stringify(apiBody);
      if (requestBody.length > MAX_PROXY_BODY_LENGTH) {
        res.status(413).json({ error: "The BIMserver.center request body is too large." });
        return;
      }
    }

    try {
      const upstream = await fetch(apiUrl, {
        method,
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
        signal: AbortSignal.timeout(30_000),
      });
      await sendJsonResponse(upstream, res);
    } catch (error) {
      console.error("[cypeProxy] Upstream request failed:", error instanceof Error ? error.name : "Unknown error");
      res.status(502).json({ error: "Could not reach the BIMserver.center API." });
    }
  }
);

export const cypeDownloadFile = functions.onRequest(
  { cors: CORS_ORIGINS },
  async (req, res) => {
    if (!requirePost(req, res)) return;

    const body = getRecord(req.body) || {};
    const fileUrl = isAllowedDownloadUrl(body.fileUrl);
    const sessionId = getString(body.sessionId, 8192);
    if (!fileUrl) {
      res.status(400).json({ error: "The file URL must use a trusted BIMserver.center HTTPS host." });
      return;
    }

    try {
      const fileResponse = await fetchTrustedDownload(fileUrl, sessionId);
      if (!fileResponse.ok) {
        res.status(fileResponse.status).json({
          error: `Failed downloading the CYPE file (HTTP ${fileResponse.status}).`,
        });
        return;
      }

      const contentLength = Number(fileResponse.headers.get("content-length") || 0);
      if (contentLength > MAX_DOWNLOAD_LENGTH) {
        res.status(413).json({ error: "The CYPE file exceeds the 256 MB download limit." });
        return;
      }

      const reader = fileResponse.body?.getReader();
      if (!reader) {
        res.status(502).json({ error: "The CYPE file response had no readable content." });
        return;
      }

      const chunks: Buffer[] = [];
      let totalLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalLength += value.byteLength;
        if (totalLength > MAX_DOWNLOAD_LENGTH) {
          await reader.cancel();
          res.status(413).json({ error: "The CYPE file exceeds the 256 MB download limit." });
          return;
        }
        chunks.push(Buffer.from(value));
      }

      const file = Buffer.concat(chunks, totalLength);
      res.status(200).json({
        status: "success",
        base64: file.toString("base64"),
        contentType: fileResponse.headers.get("content-type") || "application/octet-stream",
        size: file.byteLength,
      });
    } catch (error) {
      console.error(
        "[cypeDownloadFile] Download failed:",
        error instanceof Error ? error.name : "Unknown error"
      );
      res.status(502).json({ error: "Could not download the BIMserver.center file." });
    }
  }
);
