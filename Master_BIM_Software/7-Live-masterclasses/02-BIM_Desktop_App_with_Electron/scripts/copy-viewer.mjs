import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewerBuild = path.join(projectRoot, "viewer", "dist");
const desktopBuild = path.join(projectRoot, "dist", "viewer");

await rm(desktopBuild, { recursive: true, force: true });
await mkdir(path.dirname(desktopBuild), { recursive: true });
await cp(viewerBuild, desktopBuild, { recursive: true });
