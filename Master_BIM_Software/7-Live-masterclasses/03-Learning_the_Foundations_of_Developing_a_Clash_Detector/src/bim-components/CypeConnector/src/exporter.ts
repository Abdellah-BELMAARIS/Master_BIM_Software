import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export interface ExportedModelArtifact {
  blob: Blob;
  fileName: string;
  sizeLabel: string;
  modelCount: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

/**
 * Flushes any pending FragmentsEditStudio edits on the target model(s)
 * before exporting geometry or fragment buffers.
 */
async function flushModelEdits(
  fragments: OBC.FragmentsManager,
  targetIds: string[]
): Promise<void> {
  for (const id of targetIds) {
    try {
      await fragments.core.editor.save(id);
    } catch {
      // Model may not have pending editor history; safe to continue
    }
  }
  try {
    await fragments.core.update(true);
  } catch {
    // Continue export even if core update is a no-op
  }
}

export function getLoadedModelIds(components: OBC.Components): string[] {
  const fragments = components.get(OBC.FragmentsManager);
  return Array.from(fragments.list.keys());
}

/**
 * Exports one or all currently loaded models (including BIM Studio edits)
 * to a binary .glb (glTF 2.0) file using Three.js GLTFExporter.
 */
export async function exportLoadedModelsToGlb(
  components: OBC.Components,
  modelId?: string,
  baseName?: string
): Promise<ExportedModelArtifact> {
  const fragments = components.get(OBC.FragmentsManager);
  const entries = Array.from(fragments.list.entries());
  if (entries.length === 0) {
    throw new Error("Load at least one 3D / IFC model before exporting.");
  }

  const selected = modelId
    ? entries.filter(([id]) => id === modelId)
    : entries;
  if (selected.length === 0) {
    throw new Error(`Model "${modelId}" is no longer loaded.`);
  }

  await flushModelEdits(
    fragments,
    selected.map(([id]) => id)
  );

  const exportRoot = new THREE.Group();
  exportRoot.name = "MasterBIM_Export";
  const restoreParents: Array<{ obj: THREE.Object3D; parent: THREE.Object3D | null }> = [];

  for (const [, model] of selected) {
    const obj = (model as any).object as THREE.Object3D | undefined;
    if (obj) {
      restoreParents.push({ obj, parent: obj.parent });
      exportRoot.add(obj);
    }
  }

  if (exportRoot.children.length === 0) {
    throw new Error("No exportable 3D meshes were found in the selected model.");
  }

  try {
    const exporter = new GLTFExporter();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        exportRoot,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            const json = JSON.stringify(result);
            resolve(new TextEncoder().encode(json).buffer);
          }
        },
        (error) => reject(error),
        { binary: true, onlyVisible: false }
      );
    });

    const blob = new Blob([arrayBuffer], { type: "model/gltf-binary" });
    const rawTitle = baseName?.trim() || (selected.length === 1 ? selected[0][0] : "master_bim_coordination");
    const fileName = `${sanitizeFileName(rawTitle)}.glb`;

    return {
      blob,
      fileName,
      sizeLabel: formatSize(blob.size),
      modelCount: selected.length,
    };
  } finally {
    for (const { obj, parent } of restoreParents) {
      if (parent) {
        parent.add(obj);
      } else {
        exportRoot.remove(obj);
      }
    }
  }
}

/**
 * Saves pending Fragments edits and exports the selected model as a .frag binary.
 */
export async function exportLoadedModelToFrag(
  components: OBC.Components,
  modelId?: string,
  baseName?: string
): Promise<ExportedModelArtifact> {
  const fragments = components.get(OBC.FragmentsManager);
  const entries = Array.from(fragments.list.entries());
  if (entries.length === 0) {
    throw new Error("Load at least one 3D / IFC model before exporting.");
  }

  const target = modelId
    ? entries.find(([id]) => id === modelId)
    : entries[0];
  if (!target) {
    throw new Error(`Model "${modelId}" is no longer loaded.`);
  }

  const [targetId, model] = target;
  await flushModelEdits(fragments, [targetId]);

  const buffer = await model.getBuffer(false);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const rawTitle = baseName?.trim() || targetId;
  const fileName = `${sanitizeFileName(rawTitle)}.frag`;

  return {
    blob,
    fileName,
    sizeLabel: formatSize(blob.size),
    modelCount: 1,
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
