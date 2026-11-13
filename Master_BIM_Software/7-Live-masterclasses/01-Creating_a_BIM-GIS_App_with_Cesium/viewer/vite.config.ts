import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleCypeRequest } = require("../electron/cype-proxy.cjs");

const cypeDevProxyPlugin = (): Plugin => ({
  name: "cype-dev-proxy",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || "").split("?")[0];
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
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), cypeDevProxyPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
  },
});
