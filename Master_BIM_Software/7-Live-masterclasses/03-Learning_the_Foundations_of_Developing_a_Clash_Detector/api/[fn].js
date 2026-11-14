const { handleCypeRequest } = require("../server/cype-proxy.cjs");

const ALLOWED = new Set([
  "/cypeLogin",
  "/cypeExchangeSession",
  "/cypeProxy",
  "/cypeDownloadFile",
]);

module.exports = async (req, res) => {
  const rawPath = (req.url || "/").split("?")[0];
  const fnName = Array.isArray(req.query?.fn) ? req.query.fn[0] : req.query?.fn;
  const normalized = rawPath.startsWith("/api/")
    ? `/${rawPath.slice(5)}`
    : fnName
      ? `/${fnName}`
      : rawPath;

  if (!ALLOWED.has(normalized)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: `Unknown CYPE route: ${normalized}` }));
    return;
  }

  await handleCypeRequest(normalized, req, res);
};
