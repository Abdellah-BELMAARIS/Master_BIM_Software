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

function collectWorldMeshes(components: OBC.Components): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const fragments = components.get(OBC.FragmentsManager);

  if (fragments.list.size > 0) {
    for (const [, model] of fragments.list) {
      const obj = (model as any).object as THREE.Object3D | undefined;
      if (!obj) continue;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.visible && child.geometry) {
          meshes.push(child);
        }
      });
    }
  }

  if (meshes.length === 0) {
    const roots = collectSceneModelObjects(components);
    for (const root of roots) {
      root.traverse((child) => {
        if (child instanceof THREE.Mesh && child.visible && child.geometry) {
          meshes.push(child);
        }
      });
    }
  }

  return meshes;
}

/**
 * Exports active 3D scene meshes (including built-in 10-Villa / parametric models)
 * as a valid ISO-10303-21 IFC4 STEP file using IFCTRIANGULATEDFACESET geometry.
 */
export async function exportSceneToIfc4(
  components: OBC.Components,
  baseName?: string
): Promise<ExportedModelArtifact> {
  const meshes = collectWorldMeshes(components);
  if (meshes.length === 0) {
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

  const elementIds: number[] = [];
  const v = new THREE.Vector3();
  const maxMeshes = Math.min(meshes.length, 300);

  for (let mIdx = 0; mIdx < maxMeshes; mIdx++) {
    const mesh = meshes[mIdx];
    const geom = mesh.geometry;
    const pos = geom.getAttribute("position");
    if (!pos || pos.count < 3) continue;

    mesh.updateMatrixWorld(true);
    const index = geom.getIndex();
    const triCount = index ? Math.floor(index.count / 3) : Math.floor(pos.count / 3);
    if (triCount === 0) continue;

    // Keep each mesh compact (<= 400 tris) so large parametric scenes stay fast & lightweight
    const step = Math.max(1, Math.ceil(triCount / 400));
    const coords: string[] = [];
    const faces: string[] = [];
    let vCounter = 1;

    for (let t = 0; t < triCount; t += step) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const triIndices = [i0, i1, i2];
      const faceIdx: number[] = [];
      for (const idx of triIndices) {
        v.fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld);
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
    const shapeRepId = add(`IFCSHAPEREPRESENTATION(#${bodySubCtxId},'Body','Tessellation',(#${faceSetId}))`);
    const prodShapeId = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}))`);
    const elemPlaceId = add(`IFCLOCALPLACEMENT(#${storeyPlaceId},#${worldPlaceId})`);

    const rawName = mesh.name?.trim() || `Element_${mIdx + 1}`;
    const ifcClass = inferIfcClass(rawName);
    const elemId = add(
      `${ifcClass}('${generateIfcGuid()}',#${ownerId},'${escapeIfcString(rawName)}',$,$,#${elemPlaceId},#${prodShapeId},$)`
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
