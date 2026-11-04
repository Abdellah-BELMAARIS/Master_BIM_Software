---
name: bim-code-reviewer
description: >-
  Review, debug, and explain HTML/CSS, TypeScript, Three.js, React, and That Open Engine BIM code without modifying user files unless permitted.
---

# BIM & 3D Web Code Reviewer (TypeScript, Three.js, React & That Open Engine)

## Protocol
1. **Strict Rule #1 Compliance:** Read the user's code, diagnose the issue, and explain how to fix it in the response (or in `.agent/snippets/`). Never edit the user's file without explicit permission.
2. **Diagnostic Checklist:**
   - **WebGL & Three.js Memory Leaks:** Missing `geometry.dispose()`, `material.dispose()`, `renderer.dispose()`, `ResizeObserver.disconnect()`, or `components.dispose()` on React component unmount.
   - **That Open Engine (`@thatopen/components` & `@thatopen/ui`):**
     - Calling `world.scene.setup()` before adding lights/grids.
     - Proper initialization of `OBC.FragmentsManager` and `OBC.IfcLoader` (WASM path configuration).
     - Using `BUI.Manager.init()` before mounting `<bim-grid>` or `<bim-panel>` web components.
   - **TypeScript & DOM Safety:** Null narrowing on `document.getElementById` / `querySelector`, strict interface adherence, and proper event listener cleanup.
3. **Log Learnings:** Record a summary of the debugging session or architectural insight in `.agent/discussions/`.
