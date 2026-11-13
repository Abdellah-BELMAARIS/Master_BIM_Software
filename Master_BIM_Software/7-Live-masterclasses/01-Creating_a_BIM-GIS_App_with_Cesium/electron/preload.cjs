const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopInfo", {
  platform: process.platform,
  electronVersion: process.versions.electron,
});
