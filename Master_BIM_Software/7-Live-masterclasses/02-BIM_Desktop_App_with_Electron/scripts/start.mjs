import { spawn } from "node:child_process";
import electronPath from "electron";

const electron = spawn(electronPath, ["."], { stdio: "inherit" });
electron.once("error", (error) => {
  console.error("Could not start Electron:", error);
  process.exitCode = 1;
});
electron.once("exit", (code) => {
  process.exitCode = code ?? 0;
});
