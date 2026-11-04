# 🏛️ BIM Software Engineering Reference Library (`.agent/bim-reference/`)

Welcome to the reference knowledge base for **That Open Company — Master BIM Software Development**. This guide bridges traditional full-stack web and backend engineering (Python/Django, DRF, SQL, REST/GraphQL) with modern **3D WebGL, Three.js, TypeScript, IFC data structures, That Open Engine (`@thatopen/components`), and AI BIM Agents**.

---

## 📚 Reference Modules

| Module | Directory | Topics Covered | Full-Stack / BIM Connection |
|:---:|:---|:---|:---|
| **01** | [`01-bim-app-shell-and-css-grid/`](./01-bim-app-shell-and-css-grid/README.md) | App shell layout, CSS Grid `auto-fill`, Flexbox headers, `<dialog>` modal forms, CSS custom properties | Building clean BIM dashboards and 3D viewer frame layouts |
| **02** | [`02-typescript-oop-data-management/`](./02-typescript-oop-data-management/README.md) | TypeScript interfaces, strict typing, OOP `Project` & `ProjectsManager`, JSON serialization | Equivalent to Python `Pydantic` models & Django service layers |
| **03** | [`03-threejs-webgl-lifecycle/`](./03-threejs-webgl-lifecycle/README.md) | Scene graph, PerspectiveCamera, WebGLRenderer, `ResizeObserver`, GPU disposal in React | Preventing WebGL context loss & memory leaks in single-page apps |
| **04** | [`04-thatopen-components-fragments/`](./04-thatopen-components-fragments/README.md) | IFC STEP schema vs FlatBuffers `.frag`, `@thatopen/components`, `OBC.Worlds`, `@thatopen/ui` Lit web components | Fast instanced WebGL rendering (60 FPS) and BIM property indexing |
| **05** | [`05-connected-workflows-mcp-ai/`](./05-connected-workflows-mcp-ai/README.md) | Cesium 3D Tiles (GIS), Google Sheets + Cloud Functions, Autodesk ACC/APS OAuth2, Claude MCP Server, Fragments Edit API | Full-stack cloud integration & autonomous AI BIM agents |
