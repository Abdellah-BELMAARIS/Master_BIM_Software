# Module 05 - Connecting BIM workflows

Connect BIM models to external data, cloud services, GIS, spreadsheets, and AI-assisted tools. This module builds on the BIM viewer in module 04.

## Main workflow areas
- GIS and site context: `src/bim-components/GisLayers/`.
- Spreadsheet sync: `src/bim-components/SheetsSync/`.
- External data and saved views: `src/bim-components/DataEnhancer/` and `src/bim-components/SmartViews/`.
- MCP tools and BIM quality workflows: `src/bim-components/McpAgent/` and `BimProSuite/`.
- Server-side integrations in `functions/src/` and `mcp-bim-server/src/`.
- Historical CYPE implementation in `archive/cype-integration/`.

---

## 📂 Workspace Structure
```text
5-Connecting_Workflows/
├── src/bim-components/     # GIS, Sheets, MCP, QA, and data integrations
├── src/classes/            # Project and task models
├── src/core/               # Application and database setup
├── src/react-components/   # Application pages and 3D views
├── src/ui-templates/       # Reusable BIM interface
├── functions/src/          # Firebase Cloud Functions
├── mcp-bim-server/src/     # Standalone BIM MCP server
├── ifc-to-frag/            # IFC conversion utility
├── archive/cype-integration/ # Read-only historical CYPE source
└── package.json, firebase.json, vite.config.ts
```

Run each service from its own folder and follow its `package.json` scripts. Do not edit generated `dist/`, `node_modules/`, or bundled `resources/` files as application source.
