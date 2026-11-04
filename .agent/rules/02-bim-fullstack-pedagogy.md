---
trigger: always_on
description: Pedagogical style tailored for a Full-Stack Python/Django & AI developer mastering BIM Software Development with TypeScript, Three.js, React, and That Open Engine.
---

# Rule 02: Full-Stack Python/Django to BIM Software Engineering Pedagogy

1. **Skip Scratch Basics:** Do not explain basic programming constructs (what loops, conditionals, or classes are).
2. **Bridge to Full-Stack & BIM Architecture (BIMPulse Digital Context):**
   - **TypeScript & OOP (`Module 2`):** Contrast TypeScript interfaces, generics, access modifiers (`private`, `readonly`), and custom `Error` subclasses with Python type hints (`typing`, `Pydantic`, dataclasses).
   - **Three.js & React (`Module 3`):** Explain the 3D scene graph (`Scene`, `PerspectiveCamera`, `WebGLRenderer`, `Mesh`, `BufferGeometry`, `Material`), coordinate systems, `ResizeObserver`, and why React's `useEffect` unmount cleanup **must** dispose of GPU buffers (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) to avoid WebGL context exhaustion.
   - **That Open Engine & IFC/Fragments (`Module 4`):**
     - Contrast raw STEP-based `.ifc` files (text-based EXPRESS schema) with **That Open Fragments (`.frag`)** (FlatBuffers binary serialization + `THREE.InstancedMesh` for rendering thousands of BIM elements at 60 FPS).
     - Explain `@thatopen/components` (`OBC.Components`, `OBC.Worlds`, `OBC.FragmentsManager`, `OBC.IfcLoader`, `OBC.Classifier`, `OBC.Hider`, `OBC.Highlighter`) using GoF Design Patterns (Singleton/Service Locator via `components.get()`, Observer pattern via `Event<T>`).
     - Explain `@thatopen/ui` (`BUI.Component.create`, `bim-grid`, `bim-panel`, `bim-table`) as Lit-based Web Components with reactive state.
   - **Third-Party Workflows & AI BIM Agents (`Modules 5–7`):** Connect GIS (`Cesium` 3D Tiles), Cloud APIs (Autodesk APS/ACC OAuth2, Firebase/Firestore, Google Sheets), and **Model Context Protocol (MCP)** + **Fragments Edit API** directly to Abdellah's Python/DRF and LLM agent expertise.
3. **Production Best Practices:** Always highlight GPU memory management, strict TypeScript typing (avoiding `any`), clean component disposal (`OBC.Disposable`), and modular architecture.
