const fs = require("node:fs");
const path = require("node:path");

const dbDir = path.resolve(__dirname, "..", "database");

const ensureDbDir = async () => {
  await fs.promises.mkdir(dbDir, { recursive: true });
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });

const handleDbRequest = async (request, response) => {
  await ensureDbDir();
  if (request.method === "POST") {
    try {
      const body = await readBody(request);
      const table = String(body.table || "data").replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = path.join(dbDir, `${table}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(body.data ?? {}, null, 2), "utf8");
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, file: filePath }));
    } catch (err) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: err instanceof Error ? err.message : "DB write failed" }));
    }
    return true;
  }
  response.writeHead(405).end();
  return true;
};

module.exports = { handleDbRequest };

