# 🤖 Module 06 — AI for BIM Developers (Fragments Edit API & Agents)

## 📌 Module Overview
Pioneer AI-driven Building Information Modeling development by combining large language models (LLMs), agentic workflows, and the **Fragments Edit API** to programmatically manipulate building models through natural language.

---

## 🎯 Key Learning Objectives
1. **Fragments Edit API:**
   - Programmatically mutating geometry and property sets in real time.
   - Batch updating classification metadata and element parameters.
   - Preserving schema integrity while modifying fragment buffers.

2. **Autonomous BIM Agents:**
   - Designing tool-calling agents capable of inspecting, querying, and updating BIM models.
   - Natural language queries (e.g., *"Highlight all load-bearing concrete walls exceeding 3.5m height"*).
   - Automated clash detection, code compliance verification, and quantity takeoffs.

3. **Multi-Agent Architectures in AEC:**
   - Specializing agents for structural, MEP, architectural, and cost estimation roles.
   - Orchestration pipelines connecting BIM data models to enterprise AI backends.

---

## 📂 Workspace Structure
```text
6-AI_BIM_Developers/
├── src/bim-components/
│   ├── BimProSuite/
│   ├── FragmentsEditStudio/
│   ├── McpAgent/
│   ├── Modeler/
│   └── setup/
├── src/classes/            # Project and task models
├── src/core/               # Application and database setup
├── src/firebase/           # Cloud integration
├── src/react-components/   # Pages, details, and 3D views
├── src/ui-templates/       # Reusable BIM interface
├── public/models/          # Runtime BIM models
└── package.json, vite.config.ts, firebase.json
```

Run `npm run dev` or `npm run build` from this folder. Generated `dist/` and `node_modules/` folders are not source files.
