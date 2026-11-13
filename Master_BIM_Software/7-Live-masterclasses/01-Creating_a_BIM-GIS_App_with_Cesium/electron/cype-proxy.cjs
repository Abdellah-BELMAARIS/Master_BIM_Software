const CYPE_API = "https://apis.bimserver.center/v1/BIMSERVER";
const CYPE_SCOPES = [
  "DATA_USER_READ",
  "PROJECTS_USER_READ",
  "PROJECTS_USER_WRITE",
  "CONTRIBUTIONS_USER_READ",
  "CONTRIBUTIONS_USER_WRITE",
  "OFFLINE_ACCESS",
];
const MAX_PROXY_BODY_LENGTH = 256 * 1024;
const MAX_DOWNLOAD_LENGTH = 256 * 1024 * 1024;

const getRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const getString = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const isTrustedCypeHost = (hostname) =>
  hostname === "bimserver.center" || hostname.endsWith(".bimserver.center");

const getRedirectUri = (value) => {
  const raw = getString(value, 512);
  if (!raw) throw new Error("Callback URI is required.");
  const url = new URL(raw);
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!isLocal && url.protocol !== "https:") {
    throw new Error("Callback URI must use HTTPS or localhost.");
  }
  return url.toString();
};

const getApiUrl = (endpoint, method) => {
  const clean = getString(endpoint, 2048);
  if (!clean.startsWith("/")) return null;
  if (!["GET", "POST"].includes(method)) return null;
  return new URL(`${CYPE_API}${clean}`);
};

const isAllowedDownloadUrl = (value) => {
  const raw = getString(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !isTrustedCypeHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_PROXY_BODY_LENGTH) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });

const sendJson = (response, status, payload) => {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(body);
};

const forwardJson = async (upstream, response) => {
  const text = await upstream.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  sendJson(response, upstream.status, parsed);
};

const handleCypeRequest = async (pathname, request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return true;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return true;
  }

  let body;
  try {
    body = getRecord(await readJsonBody(request)) || {};
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid request." });
    return true;
  }

  if (pathname === "/cypeLogin") {
    const clientId = getString(body.clientId, 512);
    const clientSecret = getString(body.clientSecret, 4096);
    if (!clientId || !clientSecret) {
      sendJson(response, 400, { error: "CYPE Client ID and Client Secret are required." });
      return true;
    }
    let redirectUri;
    try {
      redirectUri = getRedirectUri(body.redirectUri);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid callback URI." });
      return true;
    }
    try {
      const upstream = await fetch(`${CYPE_API}/login`, {
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
      await forwardJson(upstream, response);
    } catch {
      sendJson(response, 502, { error: "Could not reach BIMserver.center to start login." });
    }
    return true;
  }

  if (pathname === "/cypeExchangeSession") {
    const refreshToken = getString(body.refreshToken, 8192);
    const sessionTemp = getString(body.sessionTemp, 2048);
    const securityId = getString(body.securityId, 2048);
    let url;
    let init;

    if (refreshToken) {
      const clientId = getString(body.clientId, 512);
      const clientSecret = getString(body.clientSecret, 4096);
      if (!clientId || !clientSecret) {
        sendJson(response, 400, {
          error: "CYPE Client ID and Client Secret are required to refresh the session.",
        });
        return true;
      }
      url = new URL(`${CYPE_API}/login/refresh_token`);
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
      url = new URL(`${CYPE_API}/login/${encodeURIComponent(sessionTemp)}`);
      url.searchParams.set("security_id", securityId);
      init = { method: "GET", headers: { Accept: "application/json" } };
    } else {
      sendJson(response, 400, { error: "Provide a pending CYPE login or a refresh token." });
      return true;
    }

    try {
      const upstream = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
      await forwardJson(upstream, response);
    } catch {
      sendJson(response, 502, { error: "Could not exchange the BIMserver.center session." });
    }
    return true;
  }

  if (pathname === "/cypeProxy") {
    const endpoint = getString(body.endpoint, 2048);
    const sessionId = getString(body.sessionId, 8192);
    const method = getString(body.method, 8).toUpperCase() || "GET";
    const apiUrl = getApiUrl(endpoint, method);
    if (!apiUrl || !sessionId) {
      sendJson(response, 400, {
        error: "A valid BIMserver.center session and supported API route are required.",
      });
      return true;
    }

    let requestBody;
    if (method === "POST") {
      const apiBody = getRecord(body.body);
      if (!apiBody) {
        sendJson(response, 400, { error: "A JSON object is required for this BIMserver.center request." });
        return true;
      }
      requestBody = JSON.stringify(apiBody);
      if (requestBody.length > MAX_PROXY_BODY_LENGTH) {
        sendJson(response, 413, { error: "The BIMserver.center request body is too large." });
        return true;
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
      await forwardJson(upstream, response);
    } catch {
      sendJson(response, 502, { error: "Could not reach the BIMserver.center API." });
    }
    return true;
  }

  if (pathname === "/cypeDownloadFile") {
    const fileUrl = isAllowedDownloadUrl(body.fileUrl);
    const sessionId = getString(body.sessionId, 8192);
    if (!fileUrl) {
      sendJson(response, 400, { error: "The file URL must use a trusted BIMserver.center HTTPS host." });
      return true;
    }
    try {
      const headers = sessionId ? { Authorization: `Bearer ${sessionId}` } : {};
      const fileResponse = await fetch(fileUrl, { headers, signal: AbortSignal.timeout(60_000) });
      if (!fileResponse.ok) {
        sendJson(response, fileResponse.status, {
          error: `Failed downloading the CYPE file (HTTP ${fileResponse.status}).`,
        });
        return true;
      }
      const contentLength = Number(fileResponse.headers.get("content-length") || 0);
      if (contentLength > MAX_DOWNLOAD_LENGTH) {
        sendJson(response, 413, { error: "The CYPE file exceeds the 256 MB download limit." });
        return true;
      }
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      response.writeHead(200, {
        "Content-Type": fileResponse.headers.get("content-type") || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      });
      response.end(buffer);
    } catch {
      sendJson(response, 502, { error: "Could not download the CYPE file." });
    }
    return true;
  }

  return false;
};

module.exports = { handleCypeRequest };

