const http = require("node:http");
const { handleCypeRequest } = require("./cype-proxy.cjs");

const PORT = Number(process.env.PORT || 8787);
const ALLOWED = new Set([
  "/cypeLogin",
  "/cypeExchangeSession",
  "/cypeProxy",
  "/cypeDownloadFile",
]);

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (pathname === "/" || pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "master-bim-viewer-cype-proxy" }));
    return;
  }
  if (ALLOWED.has(pathname)) {
    await handleCypeRequest(pathname, req, res);
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[cype-proxy] listening on http://0.0.0.0:${PORT}`);
});
