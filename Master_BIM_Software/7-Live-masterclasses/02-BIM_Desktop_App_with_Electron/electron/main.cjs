const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { handleCypeRequest } = require("./cype-proxy.cjs");
const { handleDbRequest } = require("./local-db.cjs");

const rendererPort = 5174;
const rendererRoot = path.resolve(__dirname, "..", "dist");
let rendererServer;
let mainWindow;

const resolveInside = (root, requestPath) => {
  const resolved = path.resolve(root, `.${requestPath}`);
  const relative = path.relative(root, resolved);
  return relative.startsWith("..") || path.isAbsolute(relative) ? null : resolved;
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

const isMissingPath = (error) =>
  error && typeof error === "object" && ["ENOENT", "ENOTDIR"].includes(error.code);

const isTrustedCypeUrl = (value) => {
  try {
    const url = new URL(value);
    const h = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (h === "bimserver.center" ||
        h.endsWith(".bimserver.center") ||
        h === "cype.com" ||
        h.endsWith(".cype.com") ||
        h === "cype.es" ||
        h.endsWith(".cype.es") ||
        h.endsWith(".amazonaws.com") ||
        h.endsWith(".cloudfront.net") ||
        h.endsWith(".googleapis.com") ||
        h.endsWith(".blob.core.windows.net"))
    );
  } catch {
    return false;
  }
};

const isViewerCallbackUrl = (value, rendererUrl) => {
  try {
    const url = new URL(value);
    const viewerUrl = new URL(rendererUrl);
    return url.protocol === "http:" &&
      url.origin === viewerUrl.origin &&
      url.pathname === "/";
  } catch {
    return false;
  }
};

const startRendererServer = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname);
      } catch {
        response.writeHead(400).end("Bad request");
        return;
      }

      if (pathname === "/api/db") {
        await handleDbRequest(request, response);
        return;
      }

      if (
        pathname === "/cypeLogin" ||
        pathname === "/cypeExchangeSession" ||
        pathname === "/cypeProxy" ||
        pathname === "/cypeDownloadFile"
      ) {
        await handleCypeRequest(pathname, request, response);
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405).end();
        return;
      }

      const requestedPath = pathname === "/" ? "/viewer/index.html" : pathname;
      const candidate = resolveInside(rendererRoot, requestedPath);

      if (!candidate) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const viewerCandidate = resolveInside(path.join(rendererRoot, "viewer"), requestedPath);
      const candidates = [candidate];

      if (viewerCandidate && viewerCandidate !== candidate) candidates.push(viewerCandidate);

      const findFile = async () => {
        for (const filePath of candidates) {
          try {
            const stat = await fs.promises.stat(filePath);

      if (stat.isFile()) return filePath;

      if (stat.isDirectory()) {
              const indexPath = path.join(filePath, "index.html");

      if ((await fs.promises.stat(indexPath)).isFile()) return indexPath;
            }
          } catch (error) {

      if (!isMissingPath(error)) throw error;
          }
        }

        const viewerIndex = path.join(rendererRoot, "viewer", "index.html");
        try {
          await fs.promises.access(viewerIndex);
          return viewerIndex;
        } catch (error) {

      if (isMissingPath(error)) return path.join(rendererRoot, "index.html");
          throw error;
        }
      };

      void findFile()
        .then((filePath) => {
          response.setHeader(
            "Content-Type",
            contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
          );
          response.setHeader("X-Content-Type-Options", "nosniff");
          const stream = fs.createReadStream(filePath);
          stream.on("error", () => {
            if (!response.headersSent) response.writeHead(404);
            response.end("Not found");
          });

      if (request.method === "HEAD") {
            response.end();
          } else {
            stream.pipe(response);
          }
        })
        .catch((error) => {
          console.error("Could not serve the BIM desktop renderer:", error);
          response.writeHead(500).end("Renderer error");
        });
    });

    server.once("error", reject);
    server.listen(rendererPort, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine the local renderer server address"));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });

const createWindow = async (rendererUrl) => {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#111318",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  const handleNavigation = (event, url) => {
    if (isTrustedCypeUrl(url) || isViewerCallbackUrl(url, rendererUrl)) return;
    event.preventDefault();
  };
  window.webContents.on("will-navigate", handleNavigation);
  window.webContents.on("will-redirect", handleNavigation);
  await window.loadURL(rendererUrl);
};

app.whenReady().then(async () => {
  const rendererUrl = process.env.VITE_DEV_SERVER_URL;
  if (!rendererUrl) {
    const localRenderer = await startRendererServer();
    rendererServer = localRenderer.server;
    await createWindow(localRenderer.url);
  } else {
    await createWindow(rendererUrl);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const url = process.env.VITE_DEV_SERVER_URL;

      if (url) void createWindow(url);
      else if (rendererServer) {
        const address = rendererServer.address();

      if (address && typeof address !== "string") void createWindow(`http://127.0.0.1:${address.port}/`);
      }
    }
  });
}).catch((error) => {
  console.error("Could not start the BIM desktop app:", error);
  app.quit();
});

app.on("before-quit", () => rendererServer?.close());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
