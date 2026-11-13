import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import electronPath from "electron";
import "./copy-wasm.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewerServer = await createServer({
  root: path.join(projectRoot, "viewer"),
  configFile: path.join(projectRoot, "viewer", "vite.config.ts"),
});
await viewerServer.listen();
const viewerUrl = viewerServer.resolvedUrls?.local?.[0];
if (!viewerUrl) throw new Error("Vite did not provide a viewer development URL");

console.log(`BIM-GIS viewer ready at ${viewerUrl}`);
console.log(`Opening the viewer directly in Electron...`);
console.log("Launching the desktop app...");

const electron = spawn(electronPath, ["."], {
  env: { ...process.env, VITE_DEV_SERVER_URL: viewerUrl },
  stdio: "inherit",
});

const shutdown = async (code = 0) => {
  await viewerServer.close();
  process.exitCode = code;
};

electron.once("error", async (error) => {
  console.error("Could not start Electron:", error);
  await shutdown(1);
});
electron.once("exit", (code) => {
  void shutdown(code ?? 0);
});

process.once("SIGINT", () => electron.kill("SIGINT"));
process.once("SIGTERM", () => electron.kill("SIGTERM"));
