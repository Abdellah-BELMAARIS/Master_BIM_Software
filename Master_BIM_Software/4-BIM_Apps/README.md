# 🏢 Module 04 — Creating BIM Apps (That Open Engine & Fragments)

## 📌 Module Overview
Master the **That Open Engine** (`@thatopen/components`) and **Fragments** format (`@thatopen/fragments`) to build browser-based Building Information Modeling (BIM) applications capable of loading gigabyte-scale IFC models in milliseconds.

---

## 🎯 Key Learning Objectives
1. **That Open Engine Architecture:**
   - Understanding `OBC.Components` and component registry patterns.
   - Managing `OBC.World` instances (SimpleWorld, ShadowedScene, Postproduction).
   - Viewport configuration, raycasting, and camera control extensions.

2. **IFC to Fragments Processing:**
   - Converting heavy IFC files to lightweight flatbuffers (`.frag` format).
   - High-throughput geometry streaming with WebGL instances.
   - Managing spatial trees (`IfcSpatialStructure`), elements, and property sets (`Psets`).

3. **BIM Queries & Custom Components:**
   - Element selection, isolating, hiding, and thematic coloring.
   - Building custom components (`OBC.Component`) for domain workflows.
   - User Interface binding using That Open BUI (`@thatopen/ui`).

---

## 📂 Workspace Structure
```text
4-BIM_Apps/
├── src/
│   ├── bim-components/     # BIM tools, setup, and domain components
│   ├── classes/            # Project and task models
│   ├── core/               # Application and database setup
│   ├── firebase/           # Cloud integration
│   ├── react-components/   # Pages, details, and 3D views
│   └── ui-templates/       # Buttons, sections, grids, and tables
├── ifc-to-frag/            # IFC conversion utility and sample models
├── public/models/          # Runtime IFC, Fragments, and 3D assets
├── resources/              # Runtime decoder resources
├── index.html, style.css
└── package.json, vite.config.ts
```

Run `npm run dev` or `npm run build` from this folder. Generated `dist/` and `node_modules/` folders are not source files.
