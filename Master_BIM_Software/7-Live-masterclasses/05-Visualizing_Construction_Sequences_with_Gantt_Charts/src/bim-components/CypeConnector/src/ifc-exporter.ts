import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { collectSceneModelObjects, ExportedModelArtifact } from "./exporter";

function generateIfcGuid(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
  let out = "";
  for (let i = 0; i < 22; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function escapeIfcString(value: string): string {
  return value.replace(/'/g, "''").replace(/[\r\n]+/g, " ").slice(0, 120);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function inferIfcClass(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wall") || lower.includes("fence") || lower.includes("boundary")) return "IFCWALL";
  if (lower.includes("slab") || lower.includes("floor") || lower.includes("terrace") || lower.includes("road") || lower.includes("boulevard") || lower.includes("deck")) return "IFCSLAB";
  if (lower.includes("roof") || lower.includes("canopy") || lower.includes("solar")) return "IFCROOF";
  if (lower.includes("column") || lower.includes("pillar") || lower.includes("post")) return "IFCCOLUMN";
  if (lower.includes("beam") || lower.includes("truss") || lower.includes("girder")) return "IFCBEAM";
  if (lower.includes("window") || lower.includes("glass") || lower.includes("glazing")) return "IFCWINDOW";
  if (lower.includes("door") || lower.includes("gate")) return "IFCDOOR";
  if (lower.includes("stair") || lower.includes("step")) return "IFCSTAIR";
  return "IFCBUILDINGELEMENTPROXY";
}

interface ExportableMeshSource {
  name: string;
  ifcClass: string;
  positions: ArrayLike<number>;
  indices?: ArrayLike<number>;
  matrixWorld: THREE.Matrix4;
}

const MAX_EXPORT_MESHES = 5000;
const FRAGMENT_BATCH_SIZE = 300;
const MAX_TRIS_PER_MESH = 2000;

interface IfcStyleDef {
  r: number;
  g: number;
  b: number;
  transparency: number;
}

const IFC_STYLE_TABLE: Record<string, IfcStyleDef> = {
  IFCREINFORCINGBAR: { r: 0.88, g: 0.11, b: 0.28, transparency: 0 },
  IFCREINFORCINGMESH: { r: 0.88, g: 0.11, b: 0.28, transparency: 0 },
  IFCTENDON: { r: 0.88, g: 0.11, b: 0.28, transparency: 0 },
  IFCCOLUMN: { r: 0.15, g: 0.39, b: 0.92, transparency: 0 },
  IFCBEAM: { r: 0.96, g: 0.62, b: 0.04, transparency: 0 },
  IFCMEMBER: { r: 0.15, g: 0.39, b: 0.92, transparency: 0 },
  IFCFOOTING: { r: 0.71, g: 0.33, b: 0.04, transparency: 0 },
  IFCPILE: { r: 0.71, g: 0.33, b: 0.04, transparency: 0 },
  IFCSLAB: { r: 0.06, g: 0.73, b: 0.51, transparency: 0 },
  IFCWALL: { r: 0.78, g: 0.82, b: 0.87, transparency: 0 },
  IFCWALLSTANDARDCASE: { r: 0.78, g: 0.82, b: 0.87, transparency: 0 },
  IFCROOF: { r: 0.55, g: 0.36, b: 0.96, transparency: 0 },
  IFCSTAIR: { r: 0.55, g: 0.36, b: 0.96, transparency: 0 },
  IFCWINDOW: { r: 0.02, g: 0.71, b: 0.83, transparency: 0.55 },
  IFCCURTAINWALL: { r: 0.02, g: 0.71, b: 0.83, transparency: 0.5 },
  IFCDOOR: { r: 0.85, g: 0.47, b: 0.02, transparency: 0 },
  IFCPIPE: { r: 0.93, g: 0.28, b: 0.6, transparency: 0 },
  IFCDUCT: { r: 0.93, g: 0.28, b: 0.6, transparency: 0 },
  IFCFLOW: { r: 0.93, g: 0.28, b: 0.6, transparency: 0 },
};

const DEFAULT_IFC_STYLE: IfcStyleDef = { r: 0.58, g: 0.64, b: 0.72, transparency: 0 };

function hasReadableBufferArray(attr: unknown): attr is THREE.BufferAttribute {
  if (!attr || typeof attr !== "object") return false;
  const anyAttr = attr as { array?: ArrayLike<number>; data?: { array?: ArrayLike<number> } };
  return Boolean(anyAttr.array || anyAttr.data?.array);
}

async function collectFragmentMeshSources(
  components: OBC.Components
): Promise<ExportableMeshSource[]> {
  const sources: ExportableMeshSource[] = [];
  const fragments = components.get(OBC.FragmentsManager);
  if (fragments.list.size === 0) return sources;

  for (const [, model] of fragments.list) {
    if (sources.length >= MAX_EXPORT_MESHES) break;
    const anyModel = model as any;
    if (typeof anyModel.getItemsIdsWithGeometry !== "function" || typeof anyModel.getItemsGeometry !== "function") {
      continue;
    }

    let localIds: number[] = [];
    try {
      localIds = await anyModel.getItemsIdsWithGeometry();
    } catch {
      continue;
    }
    if (!Array.isArray(localIds) || localIds.length === 0) continue;

    const modelObj = anyModel.object as THREE.Object3D | undefined;
    if (modelObj) modelObj.updateMatrixWorld(true);
    const modelMatrix = modelObj ? modelObj.matrixWorld : new THREE.Matrix4();

    const targetIds = localIds.slice(0, MAX_EXPORT_MESHES - sources.length);
    for (let offset = 0; offset < targetIds.length && sources.length < MAX_EXPORT_MESHES; offset += FRAGMENT_BATCH_SIZE) {
      const batchIds = targetIds.slice(offset, offset + FRAGMENT_BATCH_SIZE);
      let geomGroups: any[][] = [];
      try {
        geomGroups = await anyModel.getItemsGeometry(batchIds);
      } catch {
        continue;
      }

      let itemsData: any[] = [];
      if (typeof anyModel.getItemsData === "function") {
        try {
          itemsData = await anyModel.getItemsData(batchIds, {
            attributesDefault: false,
            attributes: ["Name"],
          });
        } catch {
          itemsData = [];
        }
      }

      for (let i = 0; i < batchIds.length && sources.length < MAX_EXPORT_MESHES; i++) {
        const meshes = geomGroups[i];
        if (!Array.isArray(meshes) || meshes.length === 0) continue;

        const meta = itemsData[i];
        const rawName = String(meta?.Name?.value ?? meta?.Name ?? `Element_${batchIds[i]}`).trim();
        const rawCat = String(meta?._category?.value ?? meta?._category ?? "").trim().toUpperCase();
        const ifcClass = rawCat.startsWith("IFC") ? rawCat : inferIfcClass(rawName);

        for (const m of meshes) {
          if (sources.length >= MAX_EXPORT_MESHES) break;
          if (!m?.positions || m.positions.length < 9) continue;
          const worldMat = new THREE.Matrix4().multiplyMatrices(
            modelMatrix,
            m.transform instanceof THREE.Matrix4 ? m.transform : new THREE.Matrix4()
          );
          sources.push({
            name: rawName || `Element_${sources.length + 1}`,
            ifcClass,
            positions: m.positions,
            indices: m.indices,
            matrixWorld: worldMat,
          });
        }
      }
    }
  }

  return sources;
}

function collectSceneMeshSources(components: OBC.Components): ExportableMeshSource[] {
  const sources: ExportableMeshSource[] = [];
  const roots = collectSceneModelObjects(components);
  const vTmp = new THREE.Vector3();

  for (const root of roots) {
    root.traverse((child) => {
      if (sources.length >= MAX_EXPORT_MESHES) return;
      if (!(child instanceof THREE.Mesh) || !child.visible || !child.geometry) return;
      const geom = child.geometry;
      const pos = geom.getAttribute("position");
      if (!hasReadableBufferArray(pos) || pos.count < 3) return;

      const index = geom.getIndex();
      if (index && !hasReadableBufferArray(index)) return;

      child.updateMatrixWorld(true);
      const posArr = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        vTmp.fromBufferAttribute(pos, i);
        posArr[i * 3] = vTmp.x;
        posArr[i * 3 + 1] = vTmp.y;
        posArr[i * 3 + 2] = vTmp.z;
      }

      let idxArr: Uint32Array | undefined;
      if (index) {
        idxArr = new Uint32Array(index.count);
        for (let i = 0; i < index.count; i++) {
          idxArr[i] = index.getX(i);
        }
      }

      const rawName = child.name?.trim() || `Element_${sources.length + 1}`;
      sources.push({
        name: rawName,
        ifcClass: inferIfcClass(rawName),
        positions: posArr,
        indices: idxArr,
        matrixWorld: child.matrixWorld.clone(),
      });
    });
  }

  return sources;
}

/**
 * Exports active 3D scene meshes (including Fragments/IFC models and built-in parametric models)
 * as a valid ISO-10303-21 IFC4 STEP file using IFCTRIANGULATEDFACESET geometry.
 */
export async function exportSceneToIfc4(
  components: OBC.Components,
  baseName?: string
): Promise<ExportedModelArtifact> {
  let sources = await collectFragmentMeshSources(components);
  if (sources.length === 0) {
    sources = collectSceneMeshSources(components);
  }
  if (sources.length === 0) {
    throw new Error("Load or open a 3D / IFC model before exporting to IFC4.");
  }

  const lines: string[] = [];
  let nextId = 1;
  const add = (stmt: string): number => {
    const id = nextId++;
    lines.push(`#${id}=${stmt};`);
    return id;
  };

  const nowIso = new Date().toISOString().slice(0, 19);
  const projectTitle = escapeIfcString(baseName?.trim() || "Master BIM IFC4 Export");

  // Core Owner / Units / Spatial Hierarchy
  const personId = add(`IFCPERSON($,'User','BIM',$,$,$,$,$)`);
  const orgId = add(`IFCORGANIZATION($,'Master BIM Viewer','OpenBIM CDE',$,$)`);
  const personOrgId = add(`IFCPERSONANDORGANIZATION(#${personId},#${orgId},$)`);
  const appId = add(`IFCAPPLICATION(#${orgId},'1.0','Master BIM Viewer','MasterBIMViewer')`);
  const ownerId = add(`IFCOWNERHISTORY(#${personOrgId},#${appId},$,.ADDED.,$,#${personOrgId},#${appId},${Math.floor(Date.now() / 1000)})`);

  const lenUnitId = add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
  const areaUnitId = add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
  const volUnitId = add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
  const unitAssignId = add(`IFCUNITASSIGNMENT((#${lenUnitId},#${areaUnitId},#${volUnitId}))`);

  const originPtId = add(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const zDirId = add(`IFCDIRECTION((0.,0.,1.))`);
  const xDirId = add(`IFCDIRECTION((1.,0.,0.))`);
  const worldPlaceId = add(`IFCAXIS2PLACEMENT3D(#${originPtId},#${zDirId},#${xDirId})`);
  const contextId = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${worldPlaceId},$)`);
  const bodySubCtxId = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${contextId},$,.MODEL_VIEW.,$)`);

  const projectId = add(`IFCPROJECT('${generateIfcGuid()}',#${ownerId},'${projectTitle}',$,$,$,$,(#${contextId}),#${unitAssignId})`);
  const sitePlaceId = add(`IFCLOCALPLACEMENT($,#${worldPlaceId})`);
  const siteId = add(`IFCSITE('${generateIfcGuid()}',#${ownerId},'Default Site',$,$,#${sitePlaceId},$,$,.ELEMENT.,$,$,$,$,$)`);
  const bldgPlaceId = add(`IFCLOCALPLACEMENT(#${sitePlaceId},#${worldPlaceId})`);
  const bldgId = add(`IFCBUILDING('${generateIfcGuid()}',#${ownerId},'Main Building',$,$,#${bldgPlaceId},$,$,.ELEMENT.,$,$,$)`);
  const storeyPlaceId = add(`IFCLOCALPLACEMENT(#${bldgPlaceId},#${worldPlaceId})`);
  const storeyId = add(`IFCBUILDINGSTOREY('${generateIfcGuid()}',#${ownerId},'Level 0',$,$,#${storeyPlaceId},$,$,.ELEMENT.,0.)`);

  add(`IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerId},$,$,#${projectId},(#${siteId}))`);
  add(`IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerId},$,$,#${siteId},(#${bldgId}))`);
  add(`IFCRELAGGREGATES('${generateIfcGuid()}',#${ownerId},$,$,#${bldgId},(#${storeyId}))`);

  const styleIdCache = new Map<string, number>();
  const getStyleId = (ifcClass: string): number => {
    const existing = styleIdCache.get(ifcClass);
    if (existing) return existing;
    const def = IFC_STYLE_TABLE[ifcClass] ?? DEFAULT_IFC_STYLE;
    const colId = add(`IFCCOLOURRGB($,${def.r},${def.g},${def.b})`);
    const rendId = add(
      `IFCSURFACESTYLERENDERING(#${colId},${def.transparency},$,$,$,$,$,$,.NOTDEFINED.)`
    );
    const surfStyleId = add(`IFCSURFACESTYLE('${ifcClass}',.BOTH.,(#${rendId}))`);
    styleIdCache.set(ifcClass, surfStyleId);
    return surfStyleId;
  };

  const elementIds: number[] = [];
  const v = new THREE.Vector3();

  for (let mIdx = 0; mIdx < sources.length; mIdx++) {
    const src = sources[mIdx];
    const pos = src.positions;
    const vertCount = Math.floor(pos.length / 3);
    if (vertCount < 3) continue;

    const index = src.indices;
    const triCount = index ? Math.floor(index.length / 3) : Math.floor(vertCount / 3);
    if (triCount === 0) continue;

    const step = Math.max(1, Math.ceil(triCount / MAX_TRIS_PER_MESH));
    const coords: string[] = [];
    const faces: string[] = [];
    let vCounter = 1;

    for (let t = 0; t < triCount; t += step) {
      const i0 = index ? index[t * 3] : t * 3;
      const i1 = index ? index[t * 3 + 1] : t * 3 + 1;
      const i2 = index ? index[t * 3 + 2] : t * 3 + 2;
      if (i0 >= vertCount || i1 >= vertCount || i2 >= vertCount) continue;

      const triIndices = [i0, i1, i2];
      const faceIdx: number[] = [];
      for (const idx of triIndices) {
        v.set(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]).applyMatrix4(src.matrixWorld);
        // Convert Three.js Y-up (x, y, z) -> IFC Z-up (x, -z, y)
        const ix = Number(v.x.toFixed(4));
        const iy = Number((-v.z).toFixed(4));
        const iz = Number(v.y.toFixed(4));
        coords.push(`(${ix},${iy},${iz})`);
        faceIdx.push(vCounter++);
      }
      faces.push(`(${faceIdx[0]},${faceIdx[1]},${faceIdx[2]})`);
    }

    if (faces.length === 0) continue;

    const ptListId = add(`IFCCARTESIANPOINTLIST3D((${coords.join(",")}))`);
    const faceSetId = add(`IFCTRIANGULATEDFACESET(#${ptListId},$,.T.,(${faces.join(",")}),$)`);
    add(`IFCSTYLEDITEM(#${faceSetId},(#${getStyleId(src.ifcClass)}),$)`);
    const shapeRepId = add(`IFCSHAPEREPRESENTATION(#${bodySubCtxId},'Body','Tessellation',(#${faceSetId}))`);
    const prodShapeId = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}))`);
    const elemPlaceId = add(`IFCLOCALPLACEMENT(#${storeyPlaceId},#${worldPlaceId})`);

    const elemId = add(
      `${src.ifcClass}('${generateIfcGuid()}',#${ownerId},'${escapeIfcString(src.name)}',$,$,#${elemPlaceId},#${prodShapeId},$)`
    );
    elementIds.push(elemId);
  }

  if (elementIds.length === 0) {
    throw new Error("No valid 3D mesh triangles found to export as IFC4.");
  }

  add(
    `IFCRELCONTAINEDINSPATIALSTRUCTURE('${generateIfcGuid()}',#${ownerId},'DefaultContainer',$,(${elementIds.map((id) => `#${id}`).join(",")}),#${storeyId})`
  );

  const rawTitle = baseName?.trim() || "master_bim_ifc4";
  const fileName = `${sanitizeFileName(rawTitle)}.ifc`;
  const stepContent = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    `FILE_NAME('${escapeIfcString(fileName)}','${nowIso}',('Master BIM User'),('Master BIM Viewer'),'Master BIM IFC4 Exporter','Master BIM Viewer','');`,
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
    ...lines,
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n");

  const blob = new Blob([stepContent], { type: "application/x-step" });
  return {
    blob,
    fileName,
    sizeLabel: formatSize(blob.size),
    modelCount: elementIds.length,
  };
}
