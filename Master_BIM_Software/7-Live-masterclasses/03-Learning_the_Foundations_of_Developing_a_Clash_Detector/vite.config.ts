import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleCypeRequest } = require("./server/cype-proxy.cjs");
const { handleDbRequest } = require("./server/local-db.cjs");

const attachApiMiddleware = (middlewares: any) => {
  middlewares.use(async (req: any, res: any, next: any) => {
    const pathname = (req.url || "").split("?")[0];
    if (pathname === "/api/db") {
      await handleDbRequest(req, res);
      return;
    }
    if (
      pathname === "/cypeLogin" ||
      pathname === "/cypeExchangeSession" ||
      pathname === "/cypeProxy" ||
      pathname === "/cypeDownloadFile"
    ) {
      await handleCypeRequest(pathname, req, res);
      return;
    }
    next();
  });
};

const webApiMiddlewarePlugin = (): Plugin => ({
  name: "web-cype-db-proxy",
  configureServer(server) {
    attachApiMiddleware(server.middlewares);
  },
  configurePreviewServer(server) {
    attachApiMiddleware(server.middlewares);
  },
});

export default defineConfig({
  base: "/",
  plugins: [react(), webApiMiddlewarePlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: false,
  },
});

