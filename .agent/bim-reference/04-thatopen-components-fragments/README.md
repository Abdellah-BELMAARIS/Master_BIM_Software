# 04 · That Open Engine Architecture & Binary Fragments

## 1. Why Fragments instead of Raw IFC?
- **Raw IFC (.ifc):** STEP text file (EXPRESS schema). Parsing a 100MB IFC file in the browser takes seconds to minutes and consumes 500MB+ of JavaScript memory.
- **That Open Fragments (.frag):** Binary representation serialized using Google **FlatBuffers**. Elements sharing identical geometry are instanced into `THREE.InstancedMesh`. Loads in milliseconds, uses 10x less RAM, and renders at 60 FPS.

---

## 2. That Open Components Architecture (`@thatopen/components`)
- **`Components`:** Service Locator / Dependency Container (`const components = new OBC.Components()`).
- **`Worlds`:** Multi-scene/multi-viewport manager (`worlds.create<SimpleScene, SimpleCamera, SimpleRenderer>()`).
- **`FragmentsManager`:** Manages loaded binary `.frag` models, spatial bounding volumes (BVH), and element selection maps (`FragmentIdMap`).
- **`IfcLoader`:** Uses WebAssembly (web-ifc WASM) to parse raw IFC files and stream them directly into binary Fragments.

---

## 3. That Open UI Web Components (`@thatopen/ui`)
`@thatopen/ui` provides zero-dependency Web Components built on Lit:
- `<bim-grid>`: Flexible multi-panel dockable layouts.
- `<bim-panel>`: Collapsible side control panels.
- `<bim-table>`: Virtualized BIM property tables with multi-level tree hierarchies.
