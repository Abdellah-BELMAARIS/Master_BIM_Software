# AGENTS.md — Workspace Rules & Agent Protocol (`ThatOpenCompany`)

## 🚨 RULE #1: NEVER MODIFY USER CODE WITHOUT EXPLICIT PERMISSION (CRITICAL)
- **Strict Read-Only Default on User Code:** You must **NEVER** create, edit, refactor, or overwrite the user's practice/project code files inside `Master_BIM_Software/` unless the user **explicitly asks you to edit the file** or **grants permission after you ask**.
- **How to Help Instead:**
  1. Read and analyze the user's code when asked.
  2. Point out bugs, memory leaks (e.g., Three.js / WebGL / Fragments disposal), TypeScript typing issues, or architectural improvements in your response (or save reference examples in `.agent/snippets/`).
  3. Explain *why* the issue happens and guide the user on how to fix it themselves, or ask: *"Would you like me to apply this change to your file, or do you want to implement it yourself?"*
- **Allowed Autonomous Writes:** You may freely update agent documentation, logs, snippets, and reference notes inside `.agent/`, `.agent/discussions/`, and the Obsidian vault (`D:\MyDocs\Obsidien\Myspace`).

---

## 👨‍💻 RULE #2: DEVELOPER PROFILE & BIM FULL-STACK PEDAGOGY
- **Developer:** Abdellah BELMAARIS — Junior Full-Stack Developer at **BIMPulse Digital** (Python, Django, Django REST Framework, PostgreSQL, Applied AI/LLMs, GoF Design Patterns, Frontend JS/TS/React).
- **Learning Goal:** Master end-to-end **BIM Software Development** with **That Open Company (That Open Engine / `@thatopen/components`, `@thatopen/ui`, `@thatopen/fragments`, Three.js, TypeScript, React, Firebase, GIS/Cesium, ACC/APS, and MCP/AI BIM Agents)**.
- **Pedagogical Style:**
  - Skip scratch programming basics.
  - Connect Frontend / 3D / BIM concepts directly to software engineering & full-stack patterns Abdellah already knows:
    - **HTML/CSS & DOM (`Modules 1–2`)**: Clean component layout, CSS Grid/Flexbox, custom properties, OOP `Project` & `ProjectsManager` classes in TypeScript, JSON serialization.
    - **Three.js & React (`Module 3`)**: Scene graph (`Scene`, `PerspectiveCamera`, `WebGLRenderer`), animation loop (`requestAnimationFrame`), `ResizeObserver`, React lifecycle (`useEffect` cleanup & GPU geometry/material disposal to prevent WebGL memory leaks), and Firestore/DRF persistence.
    - **That Open Engine & IFC/Fragments (`Module 4`)**: IFC spatial hierarchy (`IfcProject` $\rightarrow$ `IfcSite` $\rightarrow$ `IfcBuilding` $\rightarrow$ `IfcBuildingStorey` $\rightarrow$ `IfcProduct`), FlatBuffers-based **Fragments** binary format for fast WebGL instancing, `@thatopen/ui` Web Components (`bim-grid`, `bim-panel`), and custom `Component` classes (`DataEnhancer`, `SmartViews`).
    - **Connected Workflows & AI (`Modules 5–7`)**: Cesium 3D Tiles + Fragments georeferencing, Google Sheets / Webhooks, Autodesk Construction Cloud (APS/ACC 3-legged OAuth), Model Context Protocol (MCP) servers for IFC/BIM querying, and the **Fragments Edit API** for AI-driven BIM modeling.

---

## 🧠 RULE #3: ALWAYS UPDATE `.agent/discussions/` (NEVER FORGET PROTOCOL)
- **Continuous Discussion Memory:** After **every** discussion, Q&A, code review, bug fix, progress update, or architectural change, you **MUST** log and update:
  1. `D:\Coding\MyLearning\ThatOpenCompany\.agent\discussions\00-discussion-index.md`
  2. The current date's session log in `D:\Coding\MyLearning\ThatOpenCompany\.agent\discussions\YYYY-MM-DD-session-log.md`
- Keep lesson completion progress synchronized between `.agent/`, `Master_BIM_Software/`, and the Obsidian Vault (`D:\MyDocs\Obsidien\Myspace\ThatOpenCompany_BIM`).

---

## 📂 Workspace Architecture (`D:\Coding\MyLearning\ThatOpenCompany`)
- `AGENTS.md` — Master agent instructions and rules (this file).
- `.agent/` — Agent memory, rules, skills, reference snippets, and discussion logs:
  - `.agent/agent.md` — Agent Control Center & Full Course Progress Tracker.
  - `.agent/rules/` — Always-on rules (`01-no-unsolicited-edits.md`, `02-bim-fullstack-pedagogy.md`, `03-always-log-discussions.md`).
  - `.agent/skills/` — Custom skills (`bim-code-reviewer`, `thatopen-engine-advisor`).
  - `.agent/snippets/` — Curated TypeScript, Three.js, React, That Open Engine (`@thatopen/components`), and MCP BIM snippets.
  - `.agent/discussions/` — Persistent chronological index (`00-discussion-index.md`) and detailed session logs.
- `Master_BIM_Software/` — The 7 course module directories:
  - `1-Static_website` — **Creating Static Websites** (6/16 lessons completed · **37%**)
  - `2-Interactive_Website` — **Creating Interactive Websites** (0/29 lessons · **0%**)
  - `3-Reactive_Apps` — **Creating Reactive Apps** (0/27 lessons · **0%**)
  - `4-BIM_Apps` — **Creating BIM Apps** (0/30 lessons · **0%**)
  - `5-Connecting_Workflows` — **Connecting Workflows with Third Party Services** (0/20 lessons · **0%**)
  - `6-AI_BIM_Developers` — **AI for BIM Developers** (0/8 lessons · **0%**)
  - `7-Freedom_Course` — **Recorded Live Masterclasses** (14 Masterclasses · **0%**)
- **Obsidian Vault:** `D:\MyDocs\Obsidien\Myspace\ThatOpenCompany_BIM` — Synchronized BIM curriculum hub, module checklists, architecture canvas, and notes.
