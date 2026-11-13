import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webIfcDirectory = path.dirname(require.resolve("web-ifc"));
const publicDirectory = path.join(projectRoot, "viewer", "public");

await mkdir(publicDirectory, { recursive: true });
await Promise.all(
  ["web-ifc.wasm", "web-ifc-mt.wasm"].map((file) =>
    copyFile(path.join(webIfcDirectory, file), path.join(publicDirectory, file)),
  ),
);
